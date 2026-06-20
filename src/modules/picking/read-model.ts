import "server-only";

import { createClient } from "@/lib/supabase/server";

export type PickingRequisitionListItem = {
  id: string;
  billNo: number | null;
  billDate: string;
  billType: string;
  status: string;
  requesterName: string;
  assigneeName: string;
  requestedAt: string;
  lineCount: number;
};

export type PickingStatusSummary = Record<string, number>;

export type PickingRequisitionLine = {
  id: string;
  lineNo: number;
  productName: string;
  requestedQty: number;
  unit: string;
  isFreeText: boolean;
};

export type PickingRequisitionEvent = {
  id: string;
  eventType: string;
  actorName: string | null;
  createdAt: string;
};

export type PickingProblemReportLine = {
  id: string;
  lineId: string | null;
  productName: string;
  requestedQty: number;
  actualQty: number;
  unit: string;
  note: string | null;
};

export type PickingProblemReport = {
  id: string;
  reportedByName: string;
  reportedAt: string;
  lines: PickingProblemReportLine[];
};

export type PickingRequisitionDetail = {
  id: string;
  billNo: number | null;
  billDate: string;
  billType: string;
  status: string;
  requesterName: string;
  assigneeName: string;
  requestedAt: string;
  pickedByName: string | null;
  pickedAt: string | null;
  sentByName: string | null;
  sentAt: string | null;
  problemByName: string | null;
  problemAt: string | null;
  lines: PickingRequisitionLine[];
  events: PickingRequisitionEvent[];
  problemReports: PickingProblemReport[];
};

type RequisitionListRow = {
  id: string;
  bill_no: number | null;
  bill_date: string;
  bill_type: string;
  status: string;
  requester_name: string;
  assignee_name: string;
  requested_at: string;
  picking_requisition_lines: { count: number }[];
};

type RequisitionDetailRow = {
  id: string;
  bill_no: number | null;
  bill_date: string;
  bill_type: string;
  status: string;
  requester_name: string;
  assignee_name: string;
  requested_at: string;
  picked_by_name: string | null;
  picked_at: string | null;
  sent_by_name: string | null;
  sent_at: string | null;
  problem_by_name: string | null;
  problem_at: string | null;
};

type RequisitionLineRow = {
  id: string;
  line_no: number;
  product_name: string;
  requested_qty: number;
  unit: string;
  is_free_text: boolean;
};

type RequisitionEventRow = {
  id: string;
  event_type: string;
  actor_name: string | null;
  created_at: string;
};

type ProblemReportLineRow = {
  id: string;
  line_id: string | null;
  product_name: string;
  requested_qty: number;
  actual_qty: number;
  unit: string;
  note: string | null;
};

type ProblemReportRow = {
  id: string;
  reported_by_name: string;
  reported_at: string;
  picking_problem_report_lines: ProblemReportLineRow[];
};

const RECENT_LIST_LIMIT = 50;

export type PickingListResult =
  | {
      status: "ok";
      items: PickingRequisitionListItem[];
      statusSummary: PickingStatusSummary;
    }
  | { status: "error" };

export async function listRecentRequisitions(): Promise<PickingListResult> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("picking_requisitions")
    .select(
      "id, bill_no, bill_date, bill_type, status, requester_name, assignee_name, requested_at, picking_requisition_lines(count)",
    )
    .order("requested_at", { ascending: false })
    .limit(RECENT_LIST_LIMIT);

  if (error) {
    return { status: "error" };
  }

  const items: PickingRequisitionListItem[] = (data as unknown as RequisitionListRow[]).map(
    (row) => ({
      id: row.id,
      billNo: row.bill_no,
      billDate: row.bill_date,
      billType: row.bill_type,
      status: row.status,
      requesterName: row.requester_name,
      assigneeName: row.assignee_name,
      requestedAt: row.requested_at,
      lineCount: row.picking_requisition_lines?.[0]?.count ?? 0,
    }),
  );

  const statusSummary: PickingStatusSummary = {};
  for (const item of items) {
    statusSummary[item.status] = (statusSummary[item.status] ?? 0) + 1;
  }

  return { status: "ok", items, statusSummary };
}

export type PickingDetailResult =
  | { status: "ok"; requisition: PickingRequisitionDetail }
  | { status: "not_found" }
  | { status: "error" };

export async function getRequisitionDetail(id: string): Promise<PickingDetailResult> {
  const supabase = await createClient();

  const [requisitionResult, linesResult, eventsResult, problemReportsResult] = await Promise.all([
    supabase
      .from("picking_requisitions")
      .select(
        "id, bill_no, bill_date, bill_type, status, requester_name, assignee_name, requested_at, picked_by_name, picked_at, sent_by_name, sent_at, problem_by_name, problem_at",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("picking_requisition_lines")
      .select("id, line_no, product_name, requested_qty, unit, is_free_text")
      .eq("requisition_id", id)
      .order("line_no", { ascending: true }),
    supabase
      .from("picking_requisition_events")
      .select("id, event_type, actor_name, created_at")
      .eq("requisition_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("picking_problem_reports")
      .select(
        "id, reported_by_name, reported_at, picking_problem_report_lines(id, line_id, product_name, requested_qty, actual_qty, unit, note)",
      )
      .eq("requisition_id", id)
      .order("reported_at", { ascending: false }),
  ]);

  if (requisitionResult.error || linesResult.error || eventsResult.error || problemReportsResult.error) {
    return { status: "error" };
  }

  if (!requisitionResult.data) {
    return { status: "not_found" };
  }

  const requisition = requisitionResult.data as unknown as RequisitionDetailRow;
  const lines = (linesResult.data ?? []) as unknown as RequisitionLineRow[];
  const events = (eventsResult.data ?? []) as unknown as RequisitionEventRow[];
  const problemReports = (problemReportsResult.data ?? []) as unknown as ProblemReportRow[];

  return {
    status: "ok",
    requisition: {
      id: requisition.id,
      billNo: requisition.bill_no,
      billDate: requisition.bill_date,
      billType: requisition.bill_type,
      status: requisition.status,
      requesterName: requisition.requester_name,
      assigneeName: requisition.assignee_name,
      requestedAt: requisition.requested_at,
      pickedByName: requisition.picked_by_name,
      pickedAt: requisition.picked_at,
      sentByName: requisition.sent_by_name,
      sentAt: requisition.sent_at,
      problemByName: requisition.problem_by_name,
      problemAt: requisition.problem_at,
      lines: lines.map((line) => ({
        id: line.id,
        lineNo: line.line_no,
        productName: line.product_name,
        requestedQty: Number(line.requested_qty),
        unit: line.unit,
        isFreeText: line.is_free_text,
      })),
      events: events.map((event) => ({
        id: event.id,
        eventType: event.event_type,
        actorName: event.actor_name,
        createdAt: event.created_at,
      })),
      problemReports: problemReports.map((report) => ({
        id: report.id,
        reportedByName: report.reported_by_name,
        reportedAt: report.reported_at,
        lines: (report.picking_problem_report_lines ?? []).map((line) => ({
          id: line.id,
          lineId: line.line_id,
          productName: line.product_name,
          requestedQty: Number(line.requested_qty),
          actualQty: Number(line.actual_qty),
          unit: line.unit,
          note: line.note,
        })),
      })),
    },
  };
}
