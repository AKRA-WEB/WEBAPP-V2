# ADR 0009: Shared Catalog Uses Source Aliases And Scope Memberships

Date: 2026-06-19

Status: Accepted

## Context

The new `import-data/` snapshots contain multiple product-like files:

- PO/GR `ProductName` has 4,793 coded products and is the broadest source.
- Returnitem `ProductName` has the same usable product-code universe as PO/GR
  but also has 531 blank rows and `#REF!` vendor/location values.
- TRDAKRA `Product` has 1,791 coded products, all present in PO/GR, plus
  floor/location/par metadata.
- W5 current stock has 116 product names and quantities but no product codes;
  21 rows do not exact-match the other product lists.

The user needs V2 to distinguish products that belong only to TRD, only to AKRA,
to both AKRA and TRD, and to W5 stock. A single flat product master row with
app-specific columns would either lose source details or create conflicting
location/vendor/unit meanings.

## Decision

V2 should model products with:

1. A shared canonical product table.
2. A source-alias table that preserves every app-specific product name/code/unit
   and unresolved legacy row.
3. A scope-membership table that records business-unit, warehouse, and module
   coverage independently.
4. Separate warehouse, location, stock balance, and stock movement tables.

TRD/AKRA/W5 membership must be derived from scope evidence, not from hard-coded
boolean columns on the canonical product row.

The initial staging import uses these confirmed business rules:

- W1 is TRD.
- W2, W3, W4, W5, C1, and C2 are AKRA.
- Products present in the TRDAKRA Product config default to `akra_trd` unless a
  future manual correction says otherwise.
- W5 unmatched name-only rows remain aliases/manual-review candidates instead
  of creating temporary canonical products.

## Consequences

- V2 can query `trd_only`, `akra_only`, `akra_trd`, and `has_w5` without
  overwriting source-specific product names.
- W5 name-only rows can be imported as aliases/manual-review candidates before
  they are confidently mapped to canonical products.
- TRDAKRA floor/location/par data moves to warehouse placement tables instead
  of polluting the canonical product master.
- Import tooling must keep source row traceability and produce manual-review
  reports before writing staging data.
- The schema is slightly more complex than a flat product table, but it matches
  the real legacy data shape and lowers migration risk.

## Alternatives Considered

- Flat product table with `is_trd`, `is_akra`, and `is_w5` booleans: rejected
  because it cannot represent per-source evidence, raw warehouse/location
  strings, or unresolved W5 names safely.
- Use PO/GR ProductName as the only master and discard other names: rejected
  because W5 and transaction history contain unmatched exact names that must be
  audited, not silently dropped.
- Keep each app's product table separate forever: rejected because V2 needs
  shared product identity across purchasing, receiving, warehouse, returns, and
  analytics.
