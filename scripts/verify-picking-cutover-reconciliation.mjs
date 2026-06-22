import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

const { Client } = pg;
const root = process.cwd();
const reportsDir = join(root, "import-reports");

if (!existsSync(reportsDir)) {
  mkdirSync(reportsDir);
}

function readDatabaseUrl() {
  let databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl && existsSync(join(root, ".env.local"))) {
    const envText = readFileSync(join(root, ".env.local"), "utf8");
    for (const line of envText.split(/\r?\n/)) {
      const match = line.match(/^\s*DATABASE_URL\s*=\s*(.+)$/);
      if (match) {
        databaseUrl = match[1].trim();
        break;
      }
    }
  }
  return databaseUrl;
}

// Read-only evidence for the Picking cutover package
// (docs/migration/picking-cutover-package.md section 3). Replaces the
// one-off, deleted `scripts/_tmp-picking-reconciliation.mjs` used in
// V2-0034 so this evidence is re-runnable instead of asserted from memory.
async function run() {
  console.log("=== AKRA V2 Picking Cutover Reconciliation (read-only) ===");

  const databaseUrl = readDatabaseUrl();
  if (!databaseUrl) {
    console.error("DATABASE_URL is required.");
    process.exit(1);
  }

  const client = new Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  let requisitionsByGroup;
  let problemReportsCount;
  let secretsCount;
  let eventsByType;
  let problemEventsMissingReport;
  let orphanLines;
  let orphanEvents;

  try {
    requisitionsByGroup = (
      await client.query(
        `select legacy_source, status, count(*)::int as count
         from public.picking_requisitions
         group by legacy_source, status
         order by legacy_source, status`,
      )
    ).rows;

    problemReportsCount = (
      await client.query("select count(*)::int as count from public.picking_problem_reports")
    ).rows[0].count;

    secretsCount = (
      await client.query("select count(*)::int as count from public.picking_requisition_secrets")
    ).rows[0].count;

    eventsByType = (
      await client.query(
        `select event_type, count(*)::int as count
         from public.picking_requisition_events
         group by event_type
         order by event_type`,
      )
    ).rows;

    // Known V2-0019 seed-script gap: a `problem_reported` event with no
    // matching `picking_problem_reports` row (the seed writes the event
    // directly instead of calling `report_picking_problem`). Surfaced here
    // instead of trusted as "fixed" or "the only instance" from memory.
    problemEventsMissingReport = (
      await client.query(
        `select e.requisition_id, r.legacy_uid, r.legacy_source
         from public.picking_requisition_events e
         join public.picking_requisitions r on r.id = e.requisition_id
         where e.event_type = 'problem_reported'
           and not exists (
             select 1 from public.picking_problem_reports p
             where p.requisition_id = e.requisition_id
           )`,
      )
    ).rows;

    // Foreign keys cascade-delete, so these should always be empty; kept as
    // an explicit assertion rather than assumed from the schema definition.
    orphanLines = (
      await client.query(
        `select count(*)::int as count
         from public.picking_requisition_lines l
         where not exists (select 1 from public.picking_requisitions r where r.id = l.requisition_id)`,
      )
    ).rows[0].count;

    orphanEvents = (
      await client.query(
        `select count(*)::int as count
         from public.picking_requisition_events e
         where not exists (select 1 from public.picking_requisitions r where r.id = e.requisition_id)`,
      )
    ).rows[0].count;
  } finally {
    await client.end().catch(() => {});
  }

  const totalRequisitions = requisitionsByGroup.reduce((sum, row) => sum + row.count, 0);
  const v2AppCount = requisitionsByGroup
    .filter((row) => row.legacy_source === "v2_app")
    .reduce((sum, row) => sum + row.count, 0);
  const v2FixtureCount = requisitionsByGroup
    .filter((row) => row.legacy_source === "v2_fixture")
    .reduce((sum, row) => sum + row.count, 0);
  const otherSourceCount = totalRequisitions - v2AppCount - v2FixtureCount;

  console.log(`\nTotal requisitions: ${totalRequisitions} (v2_app: ${v2AppCount}, v2_fixture: ${v2FixtureCount}, other: ${otherSourceCount})`);
  console.log(`picking_problem_reports rows: ${problemReportsCount}`);
  console.log(`picking_requisition_secrets rows: ${secretsCount}`);
  console.log(`Orphan lines: ${orphanLines}, orphan events: ${orphanEvents}`);
  console.log(`problem_reported events with no matching problem_reports row: ${problemEventsMissingReport.length}`);

  const reportPath = join(reportsDir, "picking-cutover-reconciliation-report.md");
  const reportText = `# Picking Cutover Reconciliation Report

Date: ${new Date().toISOString()}
Source: staging \`public.picking_*\` tables (read-only query, no writes).

## Requisitions by legacy_source / status

| legacy_source | status | count |
| --- | --- | ---: |
${requisitionsByGroup.map((r) => `| ${r.legacy_source} | ${r.status} | ${r.count} |`).join("\n")}

Totals: **${totalRequisitions}** total, **${v2AppCount}** \`v2_app\` (real
app-created), **${v2FixtureCount}** \`v2_fixture\` (staging seed fixtures),
**${otherSourceCount}** other.

## Related Tables

| Table | Rows |
| --- | ---: |
| \`picking_problem_reports\` | ${problemReportsCount} |
| \`picking_requisition_secrets\` | ${secretsCount} |

## Events By Type

| event_type | count |
| --- | ---: |
${eventsByType.map((r) => `| ${r.event_type} | ${r.count} |`).join("\n")}

## Integrity Checks

| Check | Result |
| --- | --- |
| Orphan \`picking_requisition_lines\` (no parent requisition) | ${orphanLines} |
| Orphan \`picking_requisition_events\` (no parent requisition) | ${orphanEvents} |
| \`problem_reported\` events with no matching \`picking_problem_reports\` row | ${problemEventsMissingReport.length} |

${
  problemEventsMissingReport.length > 0
    ? `### Requisitions missing a problem-report row\n\n| requisition_id | legacy_uid | legacy_source |\n| --- | --- | --- |\n${problemEventsMissingReport
        .map((r) => `| ${r.requisition_id} | ${r.legacy_uid ?? "(none)"} | ${r.legacy_source} |`)
        .join("\n")}\n`
    : ""
}

## Recommendation

${
  v2AppCount > 0
    ? `**${v2AppCount} real app-created requisition(s) exist in staging.** If these are leftover verification/test data rather than real Picking usage, confirm before cutover whether they should be deleted or are expected to remain.`
    : "No real app-created (`v2_app`) requisitions in staging — only seed fixtures, consistent with prior slices' cleanup claims."
}
${orphanLines > 0 || orphanEvents > 0 ? "\n**Orphan rows found — investigate before cutover.**" : ""}
`;

  writeFileSync(reportPath, reportText, "utf8");
  console.log(`\nReport written to: ${reportPath}`);
}

run().catch((error) => {
  console.error("Fatal error during Picking cutover reconciliation:", error);
  process.exit(1);
});
