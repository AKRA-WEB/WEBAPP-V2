import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = join(
  rootDir,
  "docs",
  "figma",
  "akra-v2-app-workflow-board.svg",
);

const width = 3600;
let height = 3400;

const statusStyles = {
  verified: {
    fill: "#DCFCE7",
    stroke: "#15803D",
    label: "Implemented + staging verified",
  },
  cutoverGate: {
    fill: "#FEF3C7",
    stroke: "#B45309",
    label: "Implemented; cutover gated",
  },
  readOnly: {
    fill: "#DBEAFE",
    stroke: "#1D4ED8",
    label: "Read-only UI implemented",
  },
  planned: {
    fill: "#EDE9FE",
    stroke: "#6D28D9",
    label: "Planned / write workflow gated",
  },
  placeholder: {
    fill: "#F1F5F9",
    stroke: "#475569",
    label: "Permission-guarded placeholder",
  },
  lowConfidence: {
    fill: "#FFE4E6",
    stroke: "#BE123C",
    label: "Placeholder; low-confidence flow",
  },
};

const flowNodeStyles = {
  start: { fill: "#E0F2FE", stroke: "#0284C7", text: "#0C4A6E" },
  action: { fill: "#FFFFFF", stroke: "#64748B", text: "#0F172A" },
  data: { fill: "#DBEAFE", stroke: "#2563EB", text: "#1E3A8A" },
  decision: { fill: "#FEF3C7", stroke: "#D97706", text: "#78350F" },
  state: { fill: "#EDE9FE", stroke: "#7C3AED", text: "#4C1D95" },
  event: { fill: "#FCE7F3", stroke: "#DB2777", text: "#831843" },
  reject: { fill: "#FFE4E6", stroke: "#E11D48", text: "#881337" },
  end: { fill: "#DCFCE7", stroke: "#16A34A", text: "#14532D" },
};

const modules = [
  {
    title: "1. Main Portal / Auth",
    route: "/",
    status: "verified",
    flow: [
      "M1 - User opens V2",
      "M2 - Check Supabase Auth session",
      "M3 - If signed out, show portal state and route to /login",
      "M4 - After sign-in, build server-side permission snapshot",
      "M5 - Render Thai-first module registry filtered by permission",
      "M6 - User opens an allowed module route",
      "M7 - Admin can open /admin/permissions",
      "M8 - Disallowed modules show denied/queued state",
    ],
    notes: [
      "Implemented in V2-0017.",
      "Module cards are permission-filtered.",
      "Signed-out state routes users to /login.",
    ],
  },
  {
    title: "2. Picking",
    route: "/picking",
    status: "cutoverGate",
    flow: [
      "P1 - Writer opens /picking/new and enters requester, staff, note, and lines",
      "P2 - create_picking_requisition() RPC validates products and creates bill atomically",
      "P3 - New requisition starts with status pending",
      "P4 - LINE notification branch records sent, skipped, or failed event only",
      "P5 - If LINE failed, writer/admin can use Retry LINE notification",
      "P6 - Writer/admin marks pending requisition as picked",
      "P7 - Writer/admin marks picked requisition as sent",
      "P8 - Pending or picked requisition can report problem quantities",
      "P9 - report_picking_problem() records line-level requested-vs-actual values",
      "P10 - Problem reporting does not change requisition status",
      "P11 - Sent requisition blocks new problem reports",
      "P12 - Cutover remains blocked until deployed UAT and business runbook are done",
    ],
    notes: [
      "Read/create/status/problem/LINE retry verified.",
      "Notification outcome never changes status.",
      "Production cutover waits for UAT and deployed verification.",
    ],
  },
  {
    title: "3. Purchasing - PR",
    route: "/purchasing/pr",
    status: "planned",
    flow: [
      "PR1 - User opens /purchasing/pr/new",
      "PR2 - User submits requested products, qty, vendor context, and needed date",
      "PR3 - Future write RPC creates PR header and PR lines",
      "PR4 - PR starts with status pending",
      "PR5 - Supervisor reviews pending PR",
      "PR6A - Approve path sets status approved",
      "PR7A - Approved PR becomes input to PO creation through ref_pr_uid",
      "PR6B - Reject path requires comment",
      "PR7B - Rejected PR closes and does not feed PO creation",
    ],
    notes: [
      "Schema foundation exists.",
      "Current PR source export has 0 rows.",
      "Mockup exists; runtime PR UI/write flow not built.",
    ],
  },
  {
    title: "4. Purchasing - PO",
    route: "/purchasing",
    status: "readOnly",
    flow: [
      "PO1 - Current read path opens /purchasing PO list",
      "PO2 - User filters/reviews imported PO headers",
      "PO3 - User opens /purchasing/[id] detail",
      "PO4 - Detail shows vendor, bill identity, dates, status, lines, and events",
      "PO5 - LEGACY-* po_number is labeled as synthesized when applicable",
      "PO6 - Manual-review PR linkage note appears for ADR-0022 rows",
      "PO7 - Planned write origin chooses approved PR reference or Direct PO",
      "PO8A - PR-referenced PO carries PR breadcrumb and line linkage when available",
      "PO8B - Direct PO uses stable direct bill grouping",
      "PO9 - Draft PO can be edited before approval",
      "PO10 - Purchasing approval moves PO to open/awaiting GR",
      "PO11 - GR matching updates received quantities",
      "PO12A - If every line is received, PO closes and APV can follow",
      "PO12B - If lines remain open, PO stays visible for later receiving",
    ],
    notes: [
      "V2-0047 implements read-only list/detail.",
      "253 PO headers and 748 lines imported.",
      "LEGACY-* identifiers are labelled as synthesized.",
    ],
  },
  {
    title: "5. Receiving - GR",
    route: "/receiving",
    status: "readOnly",
    flow: [
      "GR1 - Current read path opens /receiving GR list",
      "GR2 - User filters/reviews imported GR headers",
      "GR3 - User opens /receiving/[id] detail",
      "GR4 - Detail shows linked PO when available or an orphan import note",
      "GR5 - Detail shows received lines, locations, dates, and line splits",
      "GR6 - Planned write path opens 14-day receiving calendar with warehouse tabs",
      "GR7 - Receiver verifies PO items and selected GR context",
      "GR8 - Receiver inputs actual qty, exp date, and location",
      "GR9 - If item is split across locations, user opens split modal",
      "GR10 - Split modal records multi-location breakdown",
      "GR11 - Single-location items skip the split modal",
      "GR12 - Confirm receiving writes GR records and events",
      "GR13 - PO line received quantity is updated",
      "GR14A - Admin recall/reset can return PO line to pending receiving",
      "GR14B - Normal path marks GR complete",
    ],
    notes: [
      "V2-0047 implements read-only list/detail.",
      "588 GR headers, 1868 lines, 6 splits imported.",
      "Orphan GR rows render without broken links.",
    ],
  },
  {
    title: "6. Warehouse - TRDAKRA + W5",
    route: "/warehouse",
    status: "placeholder",
    flow: [
      "WH1 - User opens /warehouse hub",
      "WH2 - User chooses TRDAKRA area or W5 stock area",
      "WH3A - TRDAKRA stock audit/survey path records current stock state",
      "WH3B - Staff request path captures requested items",
      "WH4 - Duplicate check looks for active request already in pipeline",
      "WH5A - Duplicate active request is blocked",
      "WH5B - Non-duplicate request moves to dispatch",
      "WH6 - Dispatch outcome is delivered, partial, or out of stock",
      "WH7 - Partial and out-of-stock items stay visible for follow-up",
      "WH8 - W5 stock dashboard highlights low-stock items below threshold",
      "WH9 - W5 manual adjustment writes audit trail",
    ],
    notes: [
      "Route is permission-guarded only.",
      "No warehouse schema or runtime workflow yet.",
      "Flow reflects planned V2 module direction.",
    ],
  },
  {
    title: "7. Returns / Returnitem",
    route: "/returns",
    status: "lowConfidence",
    flow: [
      "R1 - User submits return or claim request",
      "R2 - Return starts with status pending",
      "R3 - Supervisor reviews request",
      "R4A - Approve path sets status approved",
      "R5A - Warehouse processes approved return",
      "R6A - Return closes with audit trail",
      "R4B - Reject path sets status rejected",
      "R5B - Rejected return ends without warehouse processing",
    ],
    notes: [
      "Route is permission-guarded only.",
      "No schema, UI mockup, or detailed plan yet.",
      "Lowest-confidence workflow on this board.",
    ],
  },
  {
    title: "8. KPI Tracker",
    route: "/kpi",
    status: "placeholder",
    flow: [
      "K1 - Supervisor opens /kpi/admin",
      "K2 - Supervisor inputs daily staff/branch KPI records",
      "K3 - Future write path stores kpi_records",
      "K4 - /kpi dashboard reads records and target config",
      "K5 - Dashboard renders trend charts",
      "K6 - Metrics compare against kpi_configs thresholds",
      "K7A - Meeting target renders green metric state",
      "K7B - Missing target renders red metric state",
      "K8 - Monthly ranking and HP-style leaderboard views summarize performance",
      "K9 - Admin maintains employees, targets, and configs",
    ],
    notes: [
      "Route is permission-guarded only.",
      "Frontend mockup exists in V2-0038.",
      "Schema/runtime workflow not built yet.",
    ],
  },
];

const flowcharts = [
  {
    title: "1. Main Portal / Auth",
    route: "/",
    status: "verified",
    summary: "Implemented route selection flow. Permission checks decide what the user can open.",
    notes: [
      "Signed-out users go to /login.",
      "Allowed modules open normally.",
      "Disallowed modules land in denied/queued state.",
    ],
    nodes: [
      ["M1", "User opens V2", "start", 0, 1],
      ["M2", "Signed in?", "decision", 1, 1],
      ["M3", "/login", "action", 1, 2],
      ["M4", "Permission snapshot", "data", 2, 1],
      ["M5", "Thai module registry", "action", 3, 1],
      ["M6", "Allowed?", "decision", 4, 1],
      ["M7", "Open module", "end", 5, 0],
      ["M8", "Access denied / queued", "reject", 5, 2],
      ["M9", "Admin permissions viewer", "end", 5, 1],
    ],
    edges: [
      ["M1", "M2"],
      ["M2", "M3", "No"],
      ["M3", "M2", "Sign in"],
      ["M2", "M4", "Yes"],
      ["M4", "M5"],
      ["M5", "M6"],
      ["M6", "M7", "Yes"],
      ["M6", "M8", "No"],
      ["M5", "M9", "Admin"],
    ],
  },
  {
    title: "2. Picking",
    route: "/picking",
    status: "cutoverGate",
    summary: "Implemented workflow. Cutover approval is separate from app behavior.",
    notes: [
      "LINE success/failure is an event only.",
      "Problem reports keep the current picking status.",
      "Sent requisitions reject new problem reports.",
    ],
    nodes: [
      ["P1", "Create requisition", "start", 0, 1],
      ["P2", "create_picking_requisition() RPC", "data", 1, 1],
      ["P3", "Status: pending", "state", 2, 1],
      ["P4", "LINE result?", "decision", 3, 1],
      ["P5", "Sent/skipped event", "event", 4, 0],
      ["P6", "Failed event", "reject", 4, 2],
      ["P7", "Retry LINE", "action", 3, 2],
      ["P8", "Mark picked", "action", 2, 2],
      ["P9", "Status: picked", "state", 3, 3],
      ["P10", "Mark sent", "action", 4, 3],
      ["P11", "Status: sent", "end", 5, 3],
      ["P12", "Report problem?", "decision", 1, 3],
      ["P13", "report_picking_problem() RPC", "data", 1, 4],
      ["P14", "Return to same status", "event", 2, 4],
      ["P15", "Reject problem report", "reject", 5, 4],
      ["P16", "Cutover gates open", "decision", 6, 1],
      ["P17", "Ready for cutover runbook", "end", 7, 0],
      ["P18", "Stay staging / UAT", "reject", 7, 2],
    ],
    edges: [
      ["P1", "P2"],
      ["P2", "P3"],
      ["P3", "P4"],
      ["P4", "P5", "Sent/skipped"],
      ["P4", "P6", "Failed"],
      ["P6", "P7"],
      ["P7", "P4", "Retry"],
      ["P3", "P8", "Writer/admin"],
      ["P8", "P9"],
      ["P9", "P10"],
      ["P10", "P11"],
      ["P3", "P12", "Pending"],
      ["P9", "P12", "Picked"],
      ["P12", "P13", "Yes"],
      ["P13", "P14"],
      ["P14", "P3", "Was pending"],
      ["P14", "P9", "Was picked"],
      ["P11", "P15", "Problem attempt"],
      ["P5", "P16"],
      ["P16", "P17", "Yes"],
      ["P16", "P18", "No"],
    ],
  },
  {
    title: "3. Purchasing - PR",
    route: "/purchasing/pr",
    status: "planned",
    summary: "Planned write flow. Reject has a clear terminal path and does not create PO.",
    notes: [
      "Current PR source has 0 rows.",
      "Runtime PR write UI/RPC is not built.",
      "Reject path ends at PR rejected/closed.",
    ],
    nodes: [
      ["PR1", "Submit PR", "start", 0, 1],
      ["PR2", "Validate products, qty, vendor, date", "action", 1, 1],
      ["PR3", "Create PR header + lines", "data", 2, 1],
      ["PR4", "Status: pending", "state", 3, 1],
      ["PR5", "Supervisor review", "decision", 4, 1],
      ["PR6", "Status: approved", "state", 5, 0],
      ["PR7", "Feed PO creation", "end", 6, 0],
      ["PR8", "Reject with comment", "reject", 5, 2],
      ["PR9", "Status: rejected / closed", "reject", 6, 2],
      ["PR10", "No PO is created", "end", 7, 2],
    ],
    edges: [
      ["PR1", "PR2"],
      ["PR2", "PR3"],
      ["PR3", "PR4"],
      ["PR4", "PR5"],
      ["PR5", "PR6", "Approve"],
      ["PR6", "PR7"],
      ["PR5", "PR8", "Reject"],
      ["PR8", "PR9"],
      ["PR9", "PR10"],
    ],
  },
  {
    title: "4. Purchasing - PO",
    route: "/purchasing",
    status: "readOnly",
    summary: "Top row is current read-only UI. Bottom row is planned write workflow.",
    notes: [
      "Read-only list/detail is implemented.",
      "Approval/change-request write behavior is planned.",
      "Closed PO follows all-lines-received decision.",
    ],
    nodes: [
      ["PO1", "PO list", "start", 0, 0],
      ["PO2", "Filter imported headers", "action", 1, 0],
      ["PO3", "PO detail", "action", 2, 0],
      ["PO4", "Show lines/status/events", "end", 3, 0],
      ["PO5", "PO origin", "decision", 0, 2],
      ["PO6", "Approved PR reference", "action", 1, 1],
      ["PO7", "Direct PO", "action", 1, 3],
      ["PO8", "Draft PO", "state", 2, 2],
      ["PO9", "Edit lines", "action", 3, 2],
      ["PO10", "Purchasing approval", "decision", 4, 2],
      ["PO11", "Open / awaiting GR", "state", 5, 2],
      ["PO12", "GR matching", "data", 6, 2],
      ["PO13", "All lines received?", "decision", 7, 2],
      ["PO14", "Closed + APV", "end", 8, 1],
      ["PO15", "Remain open", "state", 8, 3],
      ["PO16", "Changes requested", "reject", 5, 3],
    ],
    edges: [
      ["PO1", "PO2"],
      ["PO2", "PO3"],
      ["PO3", "PO4"],
      ["PO5", "PO6", "PR"],
      ["PO5", "PO7", "Direct"],
      ["PO6", "PO8"],
      ["PO7", "PO8"],
      ["PO8", "PO9"],
      ["PO9", "PO10"],
      ["PO10", "PO11", "Approve"],
      ["PO10", "PO16", "Reject/change"],
      ["PO16", "PO8", "Revise"],
      ["PO11", "PO12"],
      ["PO12", "PO13"],
      ["PO13", "PO14", "Yes"],
      ["PO13", "PO15", "No"],
      ["PO15", "PO12", "More GR"],
    ],
  },
  {
    title: "5. Receiving - GR",
    route: "/receiving",
    status: "readOnly",
    summary: "Top row is current read-only UI. Bottom row is planned receiving confirmation flow.",
    notes: [
      "Read-only list/detail is implemented.",
      "Split path rejoins before confirmation.",
      "Admin recall has a separate branch back to pending receiving.",
    ],
    nodes: [
      ["GR1", "GR list", "start", 0, 0],
      ["GR2", "Filter imported headers", "action", 1, 0],
      ["GR3", "GR detail", "action", 2, 0],
      ["GR4", "Linked PO or orphan note", "action", 3, 0],
      ["GR5", "Lines + splits", "end", 4, 0],
      ["GR6", "Receiving calendar", "start", 0, 2],
      ["GR7", "Verify PO items", "action", 1, 2],
      ["GR8", "Input qty/date/location", "action", 2, 2],
      ["GR9", "Split locations?", "decision", 3, 2],
      ["GR10", "Split modal", "action", 4, 1],
      ["GR11", "Single location", "action", 4, 3],
      ["GR12", "Confirm receiving", "data", 5, 2],
      ["GR13", "Update PO line received qty", "data", 6, 2],
      ["GR14", "Admin recall/reset?", "decision", 7, 2],
      ["GR15", "Return to pending receiving", "reject", 8, 1],
      ["GR16", "GR complete", "end", 8, 3],
    ],
    edges: [
      ["GR1", "GR2"],
      ["GR2", "GR3"],
      ["GR3", "GR4"],
      ["GR4", "GR5"],
      ["GR6", "GR7"],
      ["GR7", "GR8"],
      ["GR8", "GR9"],
      ["GR9", "GR10", "Yes"],
      ["GR9", "GR11", "No"],
      ["GR10", "GR12"],
      ["GR11", "GR12"],
      ["GR12", "GR13"],
      ["GR13", "GR14"],
      ["GR14", "GR15", "Yes"],
      ["GR14", "GR16", "No"],
    ],
  },
  {
    title: "6. Warehouse - TRDAKRA + W5",
    route: "/warehouse",
    status: "placeholder",
    summary: "Planned flow only. Duplicate requests and out-of-stock cases have explicit branches.",
    notes: [
      "Route is guarded; schema/workflow is not built.",
      "Duplicate request branch is blocked.",
      "Partial/out-of-stock stay visible for follow-up.",
    ],
    nodes: [
      ["WH1", "Warehouse hub", "start", 0, 2],
      ["WH2", "Choose area", "decision", 1, 2],
      ["WH3", "Stock audit / survey", "action", 2, 0],
      ["WH4", "Staff request items", "action", 2, 2],
      ["WH5", "Duplicate active request?", "decision", 3, 2],
      ["WH6", "Block duplicate", "reject", 4, 1],
      ["WH7", "Dispatch", "action", 4, 2],
      ["WH8", "Dispatch outcome", "decision", 5, 2],
      ["WH9", "Delivered", "end", 6, 0],
      ["WH10", "Partial follow-up", "state", 6, 2],
      ["WH11", "Out of stock follow-up", "reject", 6, 4],
      ["WH12", "W5 stock dashboard", "action", 2, 4],
      ["WH13", "Below threshold?", "decision", 3, 4],
      ["WH14", "Low-stock badge", "event", 4, 4],
      ["WH15", "Manual adjustment audit", "data", 5, 4],
    ],
    edges: [
      ["WH1", "WH2"],
      ["WH2", "WH3", "Audit"],
      ["WH2", "WH4", "Request"],
      ["WH4", "WH5"],
      ["WH5", "WH6", "Yes"],
      ["WH5", "WH7", "No"],
      ["WH7", "WH8"],
      ["WH8", "WH9", "Delivered"],
      ["WH8", "WH10", "Partial"],
      ["WH8", "WH11", "Out"],
      ["WH2", "WH12", "W5"],
      ["WH12", "WH13"],
      ["WH13", "WH14", "Yes"],
      ["WH12", "WH15", "Adjust"],
    ],
  },
  {
    title: "7. Returns / Returnitem",
    route: "/returns",
    status: "lowConfidence",
    summary: "Low-confidence placeholder. Reject ends at rejected/closed and skips warehouse processing.",
    notes: [
      "No detailed Returnitem mapping yet.",
      "Approve path goes to warehouse processing.",
      "Reject path ends immediately.",
    ],
    nodes: [
      ["R1", "Submit return/claim", "start", 0, 1],
      ["R2", "Status: pending", "state", 1, 1],
      ["R3", "Supervisor review", "decision", 2, 1],
      ["R4", "Status: approved", "state", 3, 0],
      ["R5", "Warehouse processes return", "action", 4, 0],
      ["R6", "Status: closed", "end", 5, 0],
      ["R7", "Status: rejected", "reject", 3, 2],
      ["R8", "End: no warehouse processing", "end", 4, 2],
    ],
    edges: [
      ["R1", "R2"],
      ["R2", "R3"],
      ["R3", "R4", "Approve"],
      ["R4", "R5"],
      ["R5", "R6"],
      ["R3", "R7", "Reject"],
      ["R7", "R8"],
    ],
  },
  {
    title: "8. KPI Tracker",
    route: "/kpi",
    status: "placeholder",
    summary: "Planned analytics flow from KPI mockup.",
    notes: [
      "Mockup exists; schema/runtime is not built.",
      "Below-target branch stays visible as a red metric state.",
      "Admin config feeds target comparison.",
    ],
    nodes: [
      ["K1", "Supervisor input", "start", 0, 1],
      ["K2", "Validate record", "action", 1, 1],
      ["K3", "Store kpi_records", "data", 2, 1],
      ["K4", "Dashboard charts", "action", 3, 1],
      ["K5", "Meets target?", "decision", 4, 1],
      ["K6", "Green metric", "end", 5, 0],
      ["K7", "Red metric", "reject", 5, 2],
      ["K8", "Monthly rankings", "action", 6, 1],
      ["K9", "Admin config", "data", 3, 3],
    ],
    edges: [
      ["K1", "K2"],
      ["K2", "K3"],
      ["K3", "K4"],
      ["K4", "K5"],
      ["K5", "K6", "Yes"],
      ["K5", "K7", "No"],
      ["K6", "K8"],
      ["K7", "K8"],
      ["K9", "K5"],
    ],
  },
];

function esc(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function wrapText(text, maxChars) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

function textBlock(text, x, y, options = {}) {
  const {
    size = 26,
    weight = 500,
    fill = "#0F172A",
    maxChars = 36,
    lineHeight = Math.round(size * 1.25),
    anchor = "start",
  } = options;
  const lines = Array.isArray(text) ? text : wrapText(text, maxChars);
  const spans = lines
    .map((line, index) => {
      const dy = index === 0 ? 0 : lineHeight;
      return `<tspan x="${x}" dy="${dy}">${esc(line)}</tspan>`;
    })
    .join("");

  return `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="Inter, Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${spans}</text>`;
}

function nodeBox(x, y, w, h, label, tone = "default") {
  const tones = {
    default: { fill: "#FFFFFF", stroke: "#CBD5E1" },
    decision: { fill: "#FFFBEB", stroke: "#F59E0B" },
    data: { fill: "#EFF6FF", stroke: "#60A5FA" },
  };
  const style = tones[tone] ?? tones.default;
  const nodeId = String(label).split(" - ")[0].replace(/[^A-Za-z0-9]+/g, "-");
  const maxChars = Math.max(34, Math.floor((w - 46) / 16));
  const lines = wrapText(label, maxChars);
  const textY = y + 35 - (lines.length - 1) * 8;
  return `
    <g id="workflow-node-${nodeId}">
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${style.fill}" stroke="${style.stroke}" stroke-width="2"/>
    ${textBlock(lines, x + 22, textY, {
      size: 23,
      weight: 600,
      fill: "#0F172A",
      lineHeight: 28,
      maxChars,
    })}
    </g>
  `;
}

function arrow(x1, y1, x2, y2, label = "") {
  const labelSvg = label
    ? textBlock(label, (x1 + x2) / 2, (y1 + y2) / 2 - 10, {
        size: 18,
        weight: 600,
        fill: "#475569",
        anchor: "middle",
        maxChars: 24,
      })
    : "";
  return `
    <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#64748B" stroke-width="3" marker-end="url(#arrowhead)"/>
    ${labelSvg}
  `;
}

function pill(x, y, label, style) {
  const pillWidth = Math.max(260, label.length * 13 + 40);
  return `
    <rect x="${x}" y="${y}" width="${pillWidth}" height="40" rx="20" fill="${style.fill}" stroke="${style.stroke}" stroke-width="2"/>
    ${textBlock(label, x + 20, y + 26, {
      size: 18,
      weight: 700,
      fill: style.stroke,
      maxChars: 42,
    })}
  `;
}

function moduleCardHeight(module) {
  return Math.max(620, 235 + module.flow.length * 97, 295 + module.notes.length * 76);
}

function moduleCard(module, x, y) {
  const cardW = 3440;
  const cardH = moduleCardHeight(module);
  const style = statusStyles[module.status];
  const nodeX = x + 42;
  const noteX = x + 2290;
  const nodeW = 2160;
  const nodeH = 72;
  const nodeGap = 25;
  const firstY = y + 160;

  const flowSvg = module.flow
    .map((step, index) => {
      const stepY = firstY + index * (nodeH + nodeGap);
      const lowerStep = step.toLowerCase();
      const tone = step.includes("?") || lowerStep.includes(" path ")
        ? "decision"
        : index === 0
            || lowerStep.includes("rpc")
            || lowerStep.includes("record")
            || lowerStep.includes("store")
            || lowerStep.includes("write")
            || lowerStep.includes("update")
          ? "data"
          : "default";
      const box = nodeBox(nodeX, stepY, nodeW, nodeH, step, tone);
      const nextArrow =
        index < module.flow.length - 1
          ? arrow(
              nodeX + nodeW / 2,
              stepY + nodeH,
              nodeX + nodeW / 2,
              stepY + nodeH + nodeGap - 6,
            )
          : "";
      return `${box}${nextArrow}`;
    })
    .join("");

  const noteSvg = module.notes
    .map((note, index) =>
      textBlock(`- ${note}`, noteX, y + 202 + index * 78, {
        size: 23,
        weight: 500,
        fill: "#334155",
        maxChars: 55,
        lineHeight: 30,
      }),
    )
    .join("");

  return `
    <g id="module-${module.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}">
    <rect x="${x}" y="${y}" width="${cardW}" height="${cardH}" rx="18" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="2"/>
    <rect x="${x}" y="${y}" width="${cardW}" height="88" rx="18" fill="${style.fill}" stroke="${style.stroke}" stroke-width="0"/>
    <rect x="${x}" y="${y + 70}" width="${cardW}" height="18" fill="${style.fill}"/>
    ${textBlock(module.title, x + 34, y + 38, {
      size: 30,
      weight: 800,
      fill: "#0F172A",
      maxChars: 72,
    })}
    ${textBlock(module.route, x + 34, y + 68, {
      size: 18,
      weight: 700,
      fill: "#475569",
      maxChars: 48,
    })}
    ${pill(x + 2470, y + 25, style.label, style)}
    ${textBlock("Workflow", nodeX, y + 112, {
      size: 21,
      weight: 800,
      fill: "#475569",
      maxChars: 24,
    })}
    ${textBlock("Current truth / review notes", noteX, y + 112, {
      size: 21,
      weight: 800,
      fill: "#475569",
      maxChars: 40,
    })}
    ${flowSvg}
    ${noteSvg}
    </g>
  `;
}

function overview() {
  const x = 80;
  const y = 160;
  const nodeW = 450;
  const nodeH = 74;
  const gap = 40;
  const labels = [
    "User opens V2",
    "Supabase Auth",
    "Permission snapshot",
    "Module registry",
    "Module workflow",
    "Audit / events",
  ];

  const nodes = labels
    .map((label, index) => {
      const px = x + index * (nodeW + gap);
      const box = nodeBox(px, y, nodeW, nodeH, label, index === 2 ? "decision" : "data");
      const next =
        index < labels.length - 1
          ? arrow(px + nodeW, y + nodeH / 2, px + nodeW + gap - 7, y + nodeH / 2)
          : "";
      return `${box}${next}`;
    })
    .join("");

  return `
    <rect x="60" y="125" width="3480" height="170" rx="20" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="2"/>
    ${textBlock("System entry flow", 80, 115, {
      size: 24,
      weight: 800,
      fill: "#334155",
      maxChars: 30,
    })}
    ${nodes}
  `;
}

function legend() {
  const entries = [
    ["verified", "Main/Auth"],
    ["cutoverGate", "Picking"],
    ["readOnly", "PO/GR"],
    ["planned", "PR/write flows"],
    ["placeholder", "Warehouse/KPI"],
    ["lowConfidence", "Returns"],
  ];
  return `
    <rect x="60" y="320" width="3480" height="190" rx="20" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="2"/>
    ${textBlock("Legend", 90, 370, {
      size: 28,
      weight: 800,
      fill: "#0F172A",
      maxChars: 24,
    })}
    ${entries
      .map(([key, label], index) => {
        const style = statusStyles[key];
        const x = 250 + index * 520;
        return `
          <rect x="${x}" y="350" width="42" height="42" rx="8" fill="${style.fill}" stroke="${style.stroke}" stroke-width="2"/>
          ${textBlock(label, x + 56, 378, {
            size: 21,
            weight: 700,
            fill: "#334155",
            maxChars: 22,
          })}
        `;
      })
      .join("")}
    ${textBlock("Flow chart rule: diamond = decision; arrow label = branch; red node = Reject/blocked outcome; green rounded node = successful end state.", 90, 435, {
      size: 20,
      weight: 700,
      fill: "#334155",
      maxChars: 190,
    })}
    ${textBlock("Source: docs/architecture/app-flow-diagrams.md plus latest V2 plan board status as of 2026-06-26. Node IDs are included so reviewers can name exact steps to change.", 90, 475, {
      size: 20,
      weight: 500,
      fill: "#475569",
      maxChars: 190,
    })}
  `;
}

const chart = {
  cardW: 3440,
  colStep: 370,
  rowStep: 150,
  nodeW: 300,
  nodeH: 86,
  startX: 70,
  startY: 205,
};

function flowchartCardHeight(flowchart) {
  const maxRow = Math.max(...flowchart.nodes.map((node) => node[4]));
  return Math.max(620, chart.startY + maxRow * chart.rowStep + chart.nodeH + 140);
}

function flowNodePosition(nodeDef, cardX, cardY) {
  const [id, label, type, col, row] = nodeDef;
  return {
    id,
    label,
    type,
    x: cardX + chart.startX + col * chart.colStep,
    y: cardY + chart.startY + row * chart.rowStep,
    w: chart.nodeW,
    h: chart.nodeH,
  };
}

function centerOf(node) {
  return {
    x: node.x + node.w / 2,
    y: node.y + node.h / 2,
  };
}

function edgePoint(from, to, isStart) {
  const fromCenter = centerOf(from);
  const toCenter = centerOf(to);
  const dx = toCenter.x - fromCenter.x;
  const dy = toCenter.y - fromCenter.y;

  if (Math.abs(dx) >= Math.abs(dy)) {
    if (dx >= 0) {
      return isStart
        ? { x: from.x + from.w, y: fromCenter.y }
        : { x: to.x, y: toCenter.y };
    }
    return isStart
      ? { x: from.x, y: fromCenter.y }
      : { x: to.x + to.w, y: toCenter.y };
  }

  if (dy >= 0) {
    return isStart
      ? { x: fromCenter.x, y: from.y + from.h }
      : { x: toCenter.x, y: to.y };
  }

  return isStart
    ? { x: fromCenter.x, y: from.y }
    : { x: toCenter.x, y: to.y + to.h };
}

function flowEdge(from, to, label = "") {
  const start = edgePoint(from, to, true);
  const end = edgePoint(from, to, false);
  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2;
  const path = Math.abs(start.x - end.x) > Math.abs(start.y - end.y)
    ? `M ${start.x} ${start.y} L ${midX} ${start.y} L ${midX} ${end.y} L ${end.x} ${end.y}`
    : `M ${start.x} ${start.y} L ${start.x} ${midY} L ${end.x} ${midY} L ${end.x} ${end.y}`;
  const labelSvg = label
    ? `
      <rect x="${midX - 70}" y="${midY - 18}" width="140" height="34" rx="17" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1.5"/>
      ${textBlock(label, midX, midY + 5, {
        size: 16,
        weight: 800,
        fill: "#334155",
        anchor: "middle",
        maxChars: 18,
      })}
    `
    : "";

  return `
    <path d="${path}" fill="none" stroke="#475569" stroke-width="3" marker-end="url(#arrowhead)"/>
    ${labelSvg}
  `;
}

function flowNode(node) {
  const style = flowNodeStyles[node.type] ?? flowNodeStyles.action;
  const lines = wrapText(node.label, node.type === "decision" ? 20 : 25);
  const textY = node.y + node.h / 2 - (lines.length - 1) * 11 + 7;

  if (node.type === "decision") {
    const cx = node.x + node.w / 2;
    const cy = node.y + node.h / 2;
    const points = [
      `${cx},${node.y}`,
      `${node.x + node.w},${cy}`,
      `${cx},${node.y + node.h}`,
      `${node.x},${cy}`,
    ].join(" ");
    return `
      <g id="flow-node-${node.id}">
        <polygon points="${points}" fill="${style.fill}" stroke="${style.stroke}" stroke-width="3"/>
        ${textBlock(lines, cx, textY, {
          size: 18,
          weight: 850,
          fill: style.text,
          anchor: "middle",
          lineHeight: 22,
          maxChars: 20,
        })}
      </g>
    `;
  }

  const rx = node.type === "start" || node.type === "end" ? 28 : 10;
  return `
    <g id="flow-node-${node.id}">
      <rect x="${node.x}" y="${node.y}" width="${node.w}" height="${node.h}" rx="${rx}" fill="${style.fill}" stroke="${style.stroke}" stroke-width="3"/>
      ${textBlock(lines, node.x + node.w / 2, textY, {
        size: 19,
        weight: 800,
        fill: style.text,
        anchor: "middle",
        lineHeight: 23,
        maxChars: 25,
      })}
    </g>
  `;
}

function flowchartSection(flowchart, x, y) {
  const cardH = flowchartCardHeight(flowchart);
  const status = statusStyles[flowchart.status];
  const nodes = flowchart.nodes.map((nodeDef) => flowNodePosition(nodeDef, x, y));
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const edgeSvg = flowchart.edges
    .map(([fromId, toId, label]) => flowEdge(nodeById.get(fromId), nodeById.get(toId), label))
    .join("");
  const noteX = x + 1920;
  const notesSvg = flowchart.notes
    .map((note, index) =>
      textBlock(`- ${note}`, noteX, y + 118 + index * 34, {
        size: 18,
        weight: 600,
        fill: "#334155",
        maxChars: 78,
        lineHeight: 23,
      }),
    )
    .join("");

  return `
    <g id="flowchart-${flowchart.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}">
      <rect x="${x}" y="${y}" width="${chart.cardW}" height="${cardH}" rx="18" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="2"/>
      <rect x="${x}" y="${y}" width="${chart.cardW}" height="84" rx="18" fill="${status.fill}"/>
      <rect x="${x}" y="${y + 66}" width="${chart.cardW}" height="18" fill="${status.fill}"/>
      ${textBlock(flowchart.title, x + 34, y + 38, {
        size: 30,
        weight: 850,
        fill: "#0F172A",
        maxChars: 72,
      })}
      ${textBlock(flowchart.route, x + 34, y + 68, {
        size: 18,
        weight: 800,
        fill: "#475569",
        maxChars: 42,
      })}
      ${pill(x + 2480, y + 23, status.label, status)}
      ${textBlock(flowchart.summary, x + 42, y + 128, {
        size: 21,
        weight: 650,
        fill: "#334155",
        maxChars: 118,
        lineHeight: 27,
      })}
      ${textBlock("Review notes", noteX, y + 92, {
        size: 18,
        weight: 850,
        fill: "#475569",
        maxChars: 24,
      })}
      ${notesSvg}
      ${edgeSvg}
      ${nodes.map((node) => flowNode(node)).join("")}
    </g>
  `;
}

const cardPositions = [];
let nextCardY = 540;

for (const flowchart of flowcharts) {
  cardPositions.push({
    x: 80,
    y: nextCardY,
  });
  nextCardY += flowchartCardHeight(flowchart) + 56;
}

const footerY = nextCardY + 12;
height = footerY + 160;

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <marker id="arrowhead" markerWidth="12" markerHeight="8" refX="11" refY="4" orient="auto" markerUnits="strokeWidth">
      <path d="M0,0 L12,4 L0,8 Z" fill="#64748B"/>
    </marker>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="8" flood-color="#0F172A" flood-opacity="0.10"/>
    </filter>
  </defs>
  <rect width="${width}" height="${height}" fill="#F8FAFC"/>
  <g filter="url(#shadow)">
    <rect x="50" y="40" width="3500" height="80" rx="20" fill="#0F172A"/>
  </g>
  ${textBlock("AKRA WEBAPP V2 - Flow Chart Workflow Diagram", 80, 92, {
    size: 38,
    weight: 850,
    fill: "#FFFFFF",
    maxChars: 80,
  })}
  ${textBlock("Import into Figma/FigJam, ungroup, then edit node boxes/arrows/text directly.", 1720, 92, {
    size: 20,
    weight: 600,
    fill: "#CBD5E1",
    maxChars: 95,
  })}
  ${overview()}
  ${legend()}
  ${flowcharts
    .map((flowchart, index) => flowchartSection(flowchart, cardPositions[index].x, cardPositions[index].y))
    .join("")}
  <line x1="80" y1="${footerY}" x2="3520" y2="${footerY}" stroke="#CBD5E1" stroke-width="2"/>
  ${textBlock("Import note: open the provided FigJam board, drag this SVG onto the canvas, then ungroup. Use step IDs like P9, PO12A, or GR14B when requesting workflow changes.", 90, footerY + 55, {
    size: 24,
    weight: 600,
    fill: "#334155",
    maxChars: 180,
  })}
  ${textBlock("No production V1 app, GAS deployment, Sheet schema, URL, LINE token, Supabase schema, runtime code, or staging business data changed by this artifact.", 90, footerY + 98, {
    size: 21,
    weight: 500,
    fill: "#475569",
    maxChars: 180,
  })}
</svg>
`;

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, svg, "utf8");

console.log(`Wrote ${outputPath}`);
console.log(`Canvas: ${width}x${height}`);
console.log(
  `Flowchart nodes: ${flowcharts.reduce((total, flowchart) => total + flowchart.nodes.length, 0)}`,
);
console.log(
  `Flowchart edges: ${flowcharts.reduce((total, flowchart) => total + flowchart.edges.length, 0)}`,
);
