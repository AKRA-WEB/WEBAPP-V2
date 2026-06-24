# ADR 0024: Master Data Vocabulary And Folder Boundaries

Date: 2026-06-24

## Status

Accepted

## Context

The current V2 schema is strong enough to continue without a schema rewrite:
core/auth, Picking, shared catalog/warehouse, and the PR/PO/GR foundation have
all been modeled and staging-verified. The next risk is not table shape; it is
semantic drift during import and module implementation.

The main drift risks are:

- `source_app` could be confused with V2 module names (`purchasing`,
  `receiving`) even though existing shared catalog rows use source-family
  values such as `po-pr-gr`, `akra-trd`, and `akra-w5`.
- `match_status` values could be invented independently by import scripts,
  making manual-review and orphan-link reports harder to compare.
- New module code could accumulate directly under route files instead of
  domain module folders.
- PR/PO/GR dry-run/apply/verify logic could diverge if each script reimplements
  parsing and matching rules.

## Decision

Accept `docs/migration/master-data-vocabulary.md` as the vocabulary source of
truth for:

- source provenance (`source_app`, `source_file`, `legacy_source`, raw fields);
- match-status values;
- canonical product vs alias rules;
- PR/PO/GR import-specific manual-review handling; and
- folder-boundary rules for modules and import script helpers.

Keep `source_app` as a legacy source-family field, not a V2 module field. Use
`catalog_product_scopes` for module visibility (`purchasing`, `receiving`,
`warehouse`, `returns`, etc.).

Require future import scripts to reuse shared helpers under `scripts/lib/`
where parsing/matching logic is shared by dry-run, apply, and verify paths.

Require future module implementation to put domain logic under
`src/modules/<module>/`, leaving `src/app/**` route files thin.

## Consequences

- No database schema change is required for this decision.
- `V2-0044` implementation should use the accepted vocabulary before writing
  PR/PO/GR import rows.
- New `match_status` or `source_app` values should update the vocabulary doc
  before they appear in scripts or data.
- Placeholder module folders can now be tracked with README files before
  runtime implementation begins.

## Related

- Vocabulary: `docs/migration/master-data-vocabulary.md`
- Schema catalog: `docs/database/schema-catalog.md`
- Plan: `docs/plans/V2-0045-schema-master-folder-hardening.md`
- ADR: `docs/decisions/0009-shared-catalog-source-scoped-products.md`
- ADR: `docs/decisions/0020-pr-po-gr-schema-and-rls-lock.md`
- ADR: `docs/decisions/0022-pr-po-gr-3-row-pr-linkage.md`
- Plan: `docs/plans/V2-0044-pr-po-gr-staging-import-slice.md`

