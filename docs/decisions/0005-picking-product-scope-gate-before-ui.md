# ADR 0005: Picking UI Requires Product Scope And User Flow Gate

Date: 2026-06-19

## Status

Accepted

## Context

V2 has a verified staging schema for the Picking pilot, but the remaining work
would move from schema/mapping into user-facing screens and write workflows.
V1 Picking includes several connected behaviors: requisition entry, visible
daily bill numbers, LINE notifications/postbacks, status transitions, and
problem reporting.

Implementing these directly from the schema plan risks scope creep and makes it
harder to verify the first pilot slice.

## Decision

Before implementing Picking UI or server write actions, require a product scope
and user-flow gate. The gate is documented in
`docs/plans/V2-0010-picking-product-scope-and-flow.md` and must define:

- problem and users;
- MVP features;
- nice-to-have features;
- out-of-scope items;
- user flows;
- screen notes;
- system logic;
- data and integration points;
- task breakdown;
- verification steps.

The first recommended implementation path is read-only list/detail, then create
requisition, then status/problem/LINE workflows after the database flow is
proven.

## Consequences

- Future Picking implementation has a concrete product boundary before code
  changes begin.
- LINE and problem-reporting work can be sequenced deliberately instead of
  entering the first UI slice by default.
- Handoff remains clear after chat context is cleared.
- V1 production remains untouched until a module-specific cutover is approved.
