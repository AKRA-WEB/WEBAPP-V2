import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const root = process.cwd();
const STAGING_PROJECT_REF = "yqyoxtgrubuspzyfzija";
const REQUIRED_FLAG = "--confirm-picking-fixtures";
const LEGACY_SOURCE = "v2_fixture";

function readEnvLocal() {
  let url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  let secretKey = process.env.SUPABASE_SECRET_KEY;
  if (existsSync(join(root, ".env.local"))) {
    const envText = readFileSync(join(root, ".env.local"), "utf8");
    for (const line of envText.split(/\r?\n/)) {
      const matchUrl = line.match(/^\s*NEXT_PUBLIC_SUPABASE_URL\s*=\s*(.+)$/);
      const matchKey = line.match(/^\s*SUPABASE_SECRET_KEY\s*=\s*(.+)$/);
      if (matchUrl) url = matchUrl[1].trim();
      if (matchKey) secretKey = matchKey[1].trim();
    }
  }
  return { url, secretKey };
}

function todayBillDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${lookup.year}-${lookup.month}-${lookup.day}`;
}

async function run() {
  console.log("=== AKRA V2 Picking Staging Fixtures (writes to staging) ===");

  if (!process.argv.includes(REQUIRED_FLAG)) {
    console.error(`Refusing to write without ${REQUIRED_FLAG}.`);
    process.exit(1);
  }

  const { url, secretKey } = readEnvLocal();
  if (!url || !secretKey) {
    console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are required.");
    process.exit(1);
  }
  if (!url.includes(STAGING_PROJECT_REF)) {
    console.error(
      `Refusing to write: NEXT_PUBLIC_SUPABASE_URL does not target the known staging project (${STAGING_PROJECT_REF}).`,
    );
    process.exit(1);
  }

  const admin = createClient(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const staffDisplayName = "Fixture Picker (Staging)";
  let staffId;
  const { data: existingStaff, error: staffLookupError } = await admin
    .from("picking_staff")
    .select("id")
    .eq("display_name", staffDisplayName)
    .eq("legacy_source", LEGACY_SOURCE)
    .maybeSingle();

  if (staffLookupError) {
    console.error(`Staff lookup failed: ${staffLookupError.message}`);
    process.exit(1);
  }

  if (existingStaff) {
    staffId = existingStaff.id;
  } else {
    const { data: insertedStaff, error: staffInsertError } = await admin
      .from("picking_staff")
      .insert({ display_name: staffDisplayName, legacy_source: LEGACY_SOURCE })
      .select("id")
      .single();

    if (staffInsertError) {
      console.error(`Staff insert failed: ${staffInsertError.message}`);
      process.exit(1);
    }

    staffId = insertedStaff.id;
  }

  const billDate = todayBillDate();

  const requisitions = [
    {
      legacy_uid: "v2-fixture-1",
      bill_no: 1,
      bill_date: billDate,
      bill_type: "บิลจัด",
      status: "pending",
      requester_name: "Fixture Requester A",
      assignee_staff_id: staffId,
      assignee_name: staffDisplayName,
      legacy_source: LEGACY_SOURCE,
      lines: [
        { line_no: 1, product_name: "Fixture Product A1", requested_qty: 5, unit: "ลัง", is_free_text: false },
        { line_no: 2, product_name: "Fixture Product A2", requested_qty: 2, unit: "ถุง", is_free_text: false },
      ],
      events: [{ event_type: "created", actor_name: "Fixture Requester A" }],
    },
    {
      legacy_uid: "v2-fixture-2",
      bill_no: 2,
      bill_date: billDate,
      bill_type: "บิลด่วน",
      status: "picked",
      requester_name: "Fixture Requester B",
      assignee_staff_id: staffId,
      assignee_name: staffDisplayName,
      picked_by_name: staffDisplayName,
      picked_at: new Date().toISOString(),
      legacy_source: LEGACY_SOURCE,
      lines: [
        { line_no: 1, product_name: "Fixture Product B1", requested_qty: 10, unit: "ชิ้น", is_free_text: false },
        { line_no: 2, product_name: "Fixture Product B2", requested_qty: 1.5, unit: "กก.", is_free_text: false },
        { line_no: 3, product_name: "Fixture free-text item", requested_qty: 3, unit: "ชิ้น", is_free_text: true },
      ],
      events: [
        { event_type: "created", actor_name: "Fixture Requester B" },
        { event_type: "picked", actor_name: staffDisplayName },
      ],
    },
    {
      legacy_uid: "v2-fixture-3",
      bill_no: 3,
      bill_date: billDate,
      bill_type: "บิลสินค้าเรียงหน้าร้าน",
      status: "sent",
      requester_name: "Fixture Requester C",
      assignee_staff_id: staffId,
      assignee_name: staffDisplayName,
      picked_by_name: staffDisplayName,
      picked_at: new Date().toISOString(),
      sent_by_name: staffDisplayName,
      sent_at: new Date().toISOString(),
      legacy_source: LEGACY_SOURCE,
      lines: [
        { line_no: 1, product_name: "Fixture Product C1", requested_qty: 4, unit: "ลัง", is_free_text: false },
      ],
      events: [
        { event_type: "created", actor_name: "Fixture Requester C" },
        { event_type: "picked", actor_name: staffDisplayName },
        { event_type: "sent", actor_name: staffDisplayName },
      ],
    },
    {
      legacy_uid: "v2-fixture-4",
      bill_no: 4,
      bill_date: billDate,
      bill_type: "จัดเตรียมไว้ก่อน",
      status: "line_push_failed",
      requester_name: "Fixture Requester D",
      assignee_staff_id: staffId,
      assignee_name: staffDisplayName,
      problem_by_name: staffDisplayName,
      problem_at: new Date().toISOString(),
      legacy_source: LEGACY_SOURCE,
      lines: [
        { line_no: 1, product_name: "Fixture Product D1", requested_qty: 6, unit: "ถุง", is_free_text: false },
      ],
      events: [
        { event_type: "created", actor_name: "Fixture Requester D" },
        { event_type: "line_push_failed", actor_name: null },
        { event_type: "problem_reported", actor_name: staffDisplayName },
      ],
    },
  ];

  const seqUpdate = await admin
    .from("picking_daily_sequences")
    .select("last_bill_no")
    .eq("bill_date", billDate)
    .maybeSingle();

  const nextLastBillNo = Math.max(seqUpdate.data?.last_bill_no ?? 0, requisitions.length);
  const { error: seqError } = await admin
    .from("picking_daily_sequences")
    .upsert({ bill_date: billDate, last_bill_no: nextLastBillNo }, { onConflict: "bill_date" });

  if (seqError) {
    console.error(`Daily sequence upsert failed: ${seqError.message}`);
    process.exit(1);
  }

  for (const requisition of requisitions) {
    const { lines, events, ...requisitionRow } = requisition;

    const { data: upsertedRequisition, error: requisitionError } = await admin
      .from("picking_requisitions")
      .upsert(requisitionRow, { onConflict: "legacy_uid" })
      .select("id")
      .single();

    if (requisitionError) {
      console.error(`Requisition upsert failed (${requisition.legacy_uid}): ${requisitionError.message}`);
      process.exit(1);
    }

    const requisitionId = upsertedRequisition.id;

    await admin.from("picking_requisition_lines").delete().eq("requisition_id", requisitionId);
    await admin.from("picking_requisition_events").delete().eq("requisition_id", requisitionId);

    const { error: linesError } = await admin
      .from("picking_requisition_lines")
      .insert(lines.map((line) => ({ ...line, requisition_id: requisitionId })));

    if (linesError) {
      console.error(`Line insert failed (${requisition.legacy_uid}): ${linesError.message}`);
      process.exit(1);
    }

    const { error: eventsError } = await admin
      .from("picking_requisition_events")
      .insert(events.map((event) => ({ ...event, requisition_id: requisitionId })));

    if (eventsError) {
      console.error(`Event insert failed (${requisition.legacy_uid}): ${eventsError.message}`);
      process.exit(1);
    }

    console.log(`Seeded ${requisition.legacy_uid} -> ${requisitionId} (${requisition.status})`);
  }

  console.log(
    `Done. ${requisitions.length} staging-only fixture requisitions (legacy_source="${LEGACY_SOURCE}") on bill_date ${billDate}.`,
  );
}

run();
