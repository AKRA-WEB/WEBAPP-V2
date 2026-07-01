"use client";

import { Check, XCircle } from "lucide-react";
import { useActionState, useId } from "react";

import {
  approvePurchaseRequisition,
  rejectPurchaseRequisition,
  type PurchaseRequisitionTransitionState,
} from "@/modules/purchasing/transition-pr-action";

const initialTransitionState: PurchaseRequisitionTransitionState = {
  status: "idle",
  message: "",
};

export function PurchaseRequisitionTransitionControls({
  requestId,
}: {
  requestId: string;
}) {
  const reasonId = useId();
  const approveMessageId = useId();
  const rejectMessageId = useId();
  const [approveState, approveAction, isApproving] = useActionState(
    approvePurchaseRequisition.bind(null, requestId),
    initialTransitionState,
  );
  const [rejectState, rejectAction, isRejecting] = useActionState(
    rejectPurchaseRequisition.bind(null, requestId),
    initialTransitionState,
  );

  return (
    <section className="module-detail pr-transition-panel" aria-labelledby="pr-transition-title">
      <h2 id="pr-transition-title">Workflow action</h2>

      <div className="pr-transition-panel__grid">
        <form action={approveAction} className="pr-transition-form">
          <button
            aria-describedby={approveMessageId}
            className="primary-button"
            disabled={isApproving || isRejecting}
            type="submit"
          >
            <Check size={18} strokeWidth={1.8} aria-hidden="true" />
            {isApproving ? "Approving..." : "Approve PR"}
          </button>
          <p aria-live="polite" className="form-message" id={approveMessageId}>
            {approveState.message}
          </p>
        </form>

        <form action={rejectAction} className="pr-transition-form">
          <div className="field">
            <label htmlFor={reasonId}>Rejection reason</label>
            <textarea
              aria-describedby={rejectMessageId}
              id={reasonId}
              minLength={3}
              name="rejectedReason"
              required
              rows={3}
            />
          </div>
          <button
            aria-describedby={rejectMessageId}
            className="danger-button"
            disabled={isApproving || isRejecting}
            type="submit"
          >
            <XCircle size={18} strokeWidth={1.8} aria-hidden="true" />
            {isRejecting ? "Rejecting..." : "Reject PR"}
          </button>
          <p aria-live="polite" className="form-message" id={rejectMessageId}>
            {rejectState.message}
          </p>
        </form>
      </div>
    </section>
  );
}
