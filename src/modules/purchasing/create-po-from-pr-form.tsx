"use client";

import { useActionState, useId } from "react";

import {
  createPurchaseOrderFromRequisition,
  type CreatePoFromPrState,
} from "@/modules/purchasing/create-po-from-pr-action";
import type { PurchaseRequestDetail } from "@/modules/purchasing/read-model";
import type { PurchaseOrderVendorOption } from "@/modules/purchasing/reference-data";
import { formatQuantity } from "@/modules/purchasing/format";

const initialState: CreatePoFromPrState = { status: "idle", message: "" };

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

export function CreatePoFromPrForm({
  request,
  vendors,
}: {
  request: PurchaseRequestDetail;
  vendors: PurchaseOrderVendorOption[];
}) {
  const vendorId = useId();
  const poDateId = useId();
  const expectedDateId = useId();
  const noteId = useId();
  const messageId = useId();

  const [state, action, isPending] = useActionState(
    createPurchaseOrderFromRequisition.bind(null, request.id),
    initialState,
  );

  return (
    <form action={action} className="create-po-form">
      <section className="module-detail">
        <h2>PR lines ({request.lines.length})</h2>
        <ul className="requisition-lines">
          {request.lines.map((line) => (
            <li className="requisition-line" key={line.id}>
              <span className="requisition-line__no">{line.lineNo}</span>
              <span className="requisition-line__name">
                {line.catalogProductName ?? line.productName}
              </span>
              <span className="requisition-line__qty">
                {formatQuantity(line.requestedQty, line.unit)}
              </span>
              <p className="module-card__note">
                {line.warehouseName ?? line.rawWarehouse ?? "Unknown warehouse"}
              </p>
              {line.remark && <p className="module-card__note">{line.remark}</p>}
            </li>
          ))}
        </ul>
      </section>

      <section className="module-detail">
        <h2>Purchase order details</h2>

        <div className="field">
          <label htmlFor={vendorId}>Vendor</label>
          {vendors.length === 0 ? (
            <p className="form-message">No active vendors found. Add vendors to the catalog first.</p>
          ) : (
            <select id={vendorId} name="vendorId" required disabled={isPending}>
              <option value="">— select vendor —</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.displayName}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="field">
          <label htmlFor={poDateId}>PO date</label>
          <input
            defaultValue={todayBangkok()}
            disabled={isPending}
            id={poDateId}
            name="poDate"
            required
            type="date"
          />
        </div>

        <div className="field">
          <label htmlFor={expectedDateId}>Expected delivery date (optional)</label>
          <input
            disabled={isPending}
            id={expectedDateId}
            name="expectedDate"
            type="date"
          />
        </div>

        <div className="field">
          <label htmlFor={noteId}>Note (optional)</label>
          <textarea
            disabled={isPending}
            id={noteId}
            name="note"
            rows={3}
          />
        </div>

        <button
          aria-describedby={messageId}
          className="primary-button"
          disabled={isPending || vendors.length === 0}
          type="submit"
        >
          {isPending ? "Creating PO..." : "Create purchase order"}
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
