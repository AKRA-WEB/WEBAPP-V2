"use client";

import { useId, useState } from "react";

import { createPurchaseRequisition } from "@/modules/purchasing/create-pr-action";
import type {
  PurchaseRequisitionProductOption,
  PurchaseRequisitionWarehouseOption,
} from "@/modules/purchasing/reference-data";

type LineRow = {
  key: string;
  mode: "catalog" | "freeText";
  aliasId: string;
  productName: string;
  warehouseId: string;
  qty: string;
  unit: string;
  remark: string;
};

function emptyLine(): LineRow {
  return {
    key: crypto.randomUUID(),
    mode: "catalog",
    aliasId: "",
    productName: "",
    warehouseId: "",
    qty: "",
    unit: "",
    remark: "",
  };
}

export function NewPurchaseRequisitionForm({
  products,
  warehouses,
}: {
  products: PurchaseRequisitionProductOption[];
  warehouses: PurchaseRequisitionWarehouseOption[];
}) {
  const formId = useId();
  const [lines, setLines] = useState<LineRow[]>([emptyLine()]);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const productsByAliasId = new Map(products.map((item) => [item.aliasId, item]));

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
    const product = productsByAliasId.get(aliasId);
    updateLine(key, {
      aliasId,
      unit: product?.unit ?? "",
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSubmitting(true);

    try {
      const result = await createPurchaseRequisition({
        lines: lines.map((line) => ({
          mode: line.mode,
          catalogAliasId: line.mode === "catalog" ? line.aliasId : null,
          productName: line.mode === "freeText" ? line.productName : undefined,
          requestedQty: Number(line.qty),
          unit: line.unit,
          warehouseId: line.warehouseId,
          remark: line.remark,
        })),
      });

      if (result.status === "denied") {
        setMessage("You no longer have permission to create a purchase requisition. Refresh and sign in again.");
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
        {lines.map((line, index) => (
          <div className="line-row" key={line.key}>
            <div className="field">
              <label htmlFor={`${formId}-line-${index}-mode`}>Line {index + 1} type</label>
              <select
                id={`${formId}-line-${index}-mode`}
                value={line.mode}
                onChange={(event) =>
                  updateLine(line.key, {
                    mode: event.target.value as LineRow["mode"],
                    aliasId: "",
                    productName: "",
                    unit: "",
                  })
                }
              >
                <option value="catalog">Catalog product</option>
                <option value="freeText">Manual review</option>
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
                    {products.map((product) => (
                      <option key={product.aliasId} value={product.aliasId}>
                        {product.legacyCode ? `${product.legacyCode} · ${product.name}` : product.name}
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
                <label htmlFor={`${formId}-line-${index}-warehouse`}>Warehouse</label>
                <select
                  id={`${formId}-line-${index}-warehouse`}
                  value={line.warehouseId}
                  onChange={(event) => updateLine(line.key, { warehouseId: event.target.value })}
                  required
                >
                  <option value="">Select warehouse</option>
                  {warehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.displayName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor={`${formId}-line-${index}-qty`}>Quantity</label>
                <input
                  id={`${formId}-line-${index}-qty`}
                  type="number"
                  min="0.001"
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

              <div className="field line-row__wide">
                <label htmlFor={`${formId}-line-${index}-remark`}>Remark</label>
                <textarea
                  id={`${formId}-line-${index}-remark`}
                  value={line.remark}
                  onChange={(event) => updateLine(line.key, { remark: event.target.value })}
                  rows={3}
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
        {isSubmitting ? "Creating..." : "Create PR"}
      </button>
    </form>
  );
}
