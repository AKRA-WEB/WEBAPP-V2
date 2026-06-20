"use client";

import { useId, useState } from "react";

import { reportPickingProblem } from "@/modules/picking/problem-action";
import { formatQuantity } from "@/modules/picking/format";
import type { PickingRequisitionLine } from "@/modules/picking/read-model";

type LineState = {
  lineId: string;
  actualQty: string;
  note: string;
};

export function ProblemReportForm({
  requisitionId,
  lines,
}: {
  requisitionId: string;
  lines: PickingRequisitionLine[];
}) {
  const formId = useId();
  const [lineStates, setLineStates] = useState<LineState[]>(
    lines.map((line) => ({
      lineId: line.id,
      actualQty: String(line.requestedQty),
      note: "",
    })),
  );
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateLine(lineId: string, patch: Partial<LineState>) {
    setLineStates((current) =>
      current.map((line) => (line.lineId === lineId ? { ...line, ...patch } : line)),
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSubmitting(true);

    try {
      const result = await reportPickingProblem(
        requisitionId,
        lineStates.map((line) => ({
          lineId: line.lineId,
          actualQty: Number(line.actualQty),
          note: line.note,
        })),
      );

      if (result.status === "denied") {
        setMessage("You no longer have permission to report a problem. Refresh and sign in again.");
      } else if (result.status === "invalid" || result.status === "error") {
        setMessage(result.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="requisition-form" onSubmit={handleSubmit}>
      <div className="line-rows">
        {lines.map((line, index) => {
          const lineState = lineStates.find((state) => state.lineId === line.id);
          const actualQty = Number(lineState?.actualQty ?? "0");
          const isShort = Number.isFinite(actualQty) && actualQty < line.requestedQty;

          return (
            <div className="line-row" key={line.id}>
              <div>
                <strong>{line.productName}</strong>
                <p className="requisition-line__qty">
                  Requested {formatQuantity(line.requestedQty, line.unit)}
                  {isShort && ` · short ${formatQuantity(line.requestedQty - actualQty, line.unit)}`}
                </p>
              </div>

              <div className="line-row__grid">
                <div className="field">
                  <label htmlFor={`${formId}-line-${index}-actual`}>Actual qty</label>
                  <input
                    id={`${formId}-line-${index}-actual`}
                    type="number"
                    min="0"
                    step="0.001"
                    value={lineState?.actualQty ?? ""}
                    onChange={(event) => updateLine(line.id, { actualQty: event.target.value })}
                    required
                  />
                </div>

                <div className="field">
                  <label htmlFor={`${formId}-line-${index}-note`}>Note</label>
                  <input
                    id={`${formId}-line-${index}-note`}
                    type="text"
                    value={lineState?.note ?? ""}
                    onChange={(event) => updateLine(line.id, { note: event.target.value })}
                    placeholder={isShort ? "Why is this short?" : "Optional"}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p aria-live="polite" className="form-message">
        {message}
      </p>

      <button className="primary-button" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Saving…" : "Submit problem report"}
      </button>
    </form>
  );
}
