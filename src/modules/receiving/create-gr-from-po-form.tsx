"use client";

import { useActionState, useId } from "react";

import {
  createGoodsReceiptFromOrder,
  type CreateGrFromPoState,
} from "@/modules/receiving/create-gr-from-po-action";
import type { PurchaseOrderDetail } from "@/modules/purchasing/read-model";
import { formatQuantity } from "@/modules/receiving/format";

const initialState: CreateGrFromPoState = { status: "idle", message: "" };

function todayBangkok(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const lookup = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${lookup.year}-${lookup.month}-${lookup.day}`;
}

export function CreateGrFromPoForm({ order }: { order: PurchaseOrderDetail }) {
  const receiptDateId = useId();
  const remarkId = useId();
  const messageId = useId();

  const [state, action, isPending] = useActionState(
    createGoodsReceiptFromOrder.bind(null, order.id),
    initialState,
  );

  return (
    <form action={action} className="create-gr-form">
      <section className="module-detail">
        <h2>PO lines ({order.lines.length})</h2>
        <ul className="requisition-lines">
          {order.lines.map((line) => (
            <li className="requisition-line" key={line.id}>
              <span className="requisition-line__no">{line.lineNo}</span>
              <span className="requisition-line__name">
                {line.catalogProductName ?? line.productName}
              </span>
              <span className="requisition-line__qty">
                Ordered: {formatQuantity(line.orderedQty, line.unit)}
              </span>
              {line.remark && <p className="module-card__note">{line.remark}</p>}
              <div className="field">
                <label htmlFor={`qty_field_${line.id}`}>
                  Received qty ({line.unit})
                </label>
                <input
                  defaultValue=""
                  disabled={isPending}
                  id={`qty_field_${line.id}`}
                  min="0"
                  name={`qty_${line.id}`}
                  step="0.001"
                  type="number"
                />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="module-detail">
        <h2>Receipt details</h2>

        <div className="field">
          <label htmlFor={receiptDateId}>Receipt date</label>
          <input
            defaultValue={todayBangkok()}
            disabled={isPending}
            id={receiptDateId}
            name="receiptDate"
            required
            type="date"
          />
        </div>

        <div className="field">
          <label htmlFor={remarkId}>Remark (optional)</label>
          <textarea
            disabled={isPending}
            id={remarkId}
            name="remark"
            rows={3}
          />
        </div>

        <button
          aria-describedby={messageId}
          className="primary-button"
          disabled={isPending}
          type="submit"
        >
          {isPending ? "Creating goods receipt..." : "Create goods receipt"}
        </button>

        {state.status === "error" && (
          <p aria-live="polite" className="form-message" id={messageId}>
            {state.message}
          </p>
        )}
      </section>
    </form>
  );
}
