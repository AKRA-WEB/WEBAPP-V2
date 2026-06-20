"use client";

import { useId, useState } from "react";

import { createPickingRequisition } from "@/modules/picking/create-action";
import type { PickingProductSuggestion, PickingStaffOption } from "@/modules/picking/reference-data";
import { PICKING_BILL_TYPES } from "@/modules/picking/format";

type LineRow = {
  key: string;
  mode: "catalog" | "freeText";
  aliasId: string;
  productName: string;
  unit: string;
  qty: string;
};

function emptyLine(): LineRow {
  return {
    key: crypto.randomUUID(),
    mode: "catalog",
    aliasId: "",
    productName: "",
    unit: "",
    qty: "",
  };
}

export function NewRequisitionForm({
  staff,
  suggestions,
}: {
  staff: PickingStaffOption[];
  suggestions: PickingProductSuggestion[];
}) {
  const formId = useId();
  const [billType, setBillType] = useState<string>(PICKING_BILL_TYPES[0]);
  const [assigneeStaffId, setAssigneeStaffId] = useState("");
  const [lines, setLines] = useState<LineRow[]>([emptyLine()]);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const suggestionsByAliasId = new Map(suggestions.map((item) => [item.aliasId, item]));

  function updateLine(key: string, patch: Partial<LineRow>) {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  }

  function addLine() {
    setLines((current) => [...current, emptyLine()]);
  }

  function removeLine(key: string) {
    setLines((current) => (current.length > 1 ? current.filter((line) => line.key !== key) : current));
  }

  function handleAliasChange(key: string, aliasId: string) {
    const suggestion = suggestionsByAliasId.get(aliasId);
    updateLine(key, {
      aliasId,
      unit: suggestion?.unit ?? "",
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSubmitting(true);

    try {
      const result = await createPickingRequisition({
        billType,
        assigneeStaffId,
        lines: lines.map((line) => {
          if (line.mode === "catalog") {
            const suggestion = suggestionsByAliasId.get(line.aliasId);
            return {
              productName: suggestion?.name ?? "",
              requestedQty: Number(line.qty),
              unit: line.unit,
              isFreeText: false,
              catalogProductId: suggestion?.productId ?? null,
              catalogAliasId: suggestion?.aliasId ?? null,
            };
          }

          return {
            productName: line.productName,
            requestedQty: Number(line.qty),
            unit: line.unit,
            isFreeText: true,
          };
        }),
      });

      if (result.status === "denied") {
        setMessage("You no longer have permission to create a requisition. Refresh and sign in again.");
      } else if (result.status === "invalid" || result.status === "error") {
        setMessage(result.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="requisition-form" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor={`${formId}-bill-type`}>Bill type</label>
        <select
          id={`${formId}-bill-type`}
          value={billType}
          onChange={(event) => setBillType(event.target.value)}
          required
        >
          {PICKING_BILL_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor={`${formId}-assignee`}>Assignee</label>
        <select
          id={`${formId}-assignee`}
          value={assigneeStaffId}
          onChange={(event) => setAssigneeStaffId(event.target.value)}
          required
        >
          <option value="">Select assignee</option>
          {staff.map((person) => (
            <option key={person.id} value={person.id}>
              {person.displayName}
            </option>
          ))}
        </select>
      </div>

      <div className="line-rows">
        {lines.map((line, index) => (
          <div className="line-row" key={line.key}>
            <div className="field">
              <label htmlFor={`${formId}-line-${index}-mode`}>Line {index + 1} type</label>
              <select
                id={`${formId}-line-${index}-mode`}
                value={line.mode}
                onChange={(event) =>
                  updateLine(line.key, { mode: event.target.value as LineRow["mode"] })
                }
              >
                <option value="catalog">Catalog product</option>
                <option value="freeText">Free text</option>
              </select>
            </div>

            <div className="line-row__grid">
              {line.mode === "catalog" ? (
                <div className="field">
                  <label htmlFor={`${formId}-line-${index}-product`}>Product</label>
                  <select
                    id={`${formId}-line-${index}-product`}
                    value={line.aliasId}
                    onChange={(event) => handleAliasChange(line.key, event.target.value)}
                    required
                  >
                    <option value="">Select product</option>
                    {suggestions.map((suggestion) => (
                      <option key={suggestion.aliasId} value={suggestion.aliasId}>
                        {suggestion.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="field">
                  <label htmlFor={`${formId}-line-${index}-product`}>Product name</label>
                  <input
                    id={`${formId}-line-${index}-product`}
                    type="text"
                    value={line.productName}
                    onChange={(event) => updateLine(line.key, { productName: event.target.value })}
                    required
                  />
                </div>
              )}

              <div className="field">
                <label htmlFor={`${formId}-line-${index}-qty`}>Quantity</label>
                <input
                  id={`${formId}-line-${index}-qty`}
                  type="number"
                  min="0"
                  step="0.001"
                  value={line.qty}
                  onChange={(event) => updateLine(line.key, { qty: event.target.value })}
                  required
                />
              </div>

              <div className="field">
                <label htmlFor={`${formId}-line-${index}-unit`}>Unit</label>
                <input
                  id={`${formId}-line-${index}-unit`}
                  type="text"
                  value={line.unit}
                  onChange={(event) => updateLine(line.key, { unit: event.target.value })}
                  required
                />
              </div>
            </div>

            <div className="line-row__footer">
              <button
                className="secondary-button"
                type="button"
                onClick={() => removeLine(line.key)}
                disabled={lines.length === 1}
              >
                Remove line
              </button>
            </div>
          </div>
        ))}
      </div>

      <button className="secondary-button" type="button" onClick={addLine}>
        Add line
      </button>

      <p aria-live="polite" className="form-message">
        {message}
      </p>

      <button className="primary-button" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Creating…" : "Create requisition"}
      </button>
    </form>
  );
}
