# ADR 0013: Picking Create Before LINE, Status, And Problem Workflows

Date: 2026-06-20

## Status

Accepted for planning

## Context

The `V2-0019` read-only Picking pilot is implemented and verified against
staging. The next possible slices are:

- create requisition;
- LINE notification and postback integration;
- in-app status transitions;
- problem reporting;
- Main portal polish under `V2-0017`.

`V2-0018` also resolved that Picking should bridge directly to the shared
catalog instead of creating an isolated product identity model for the pilot.

## Decision

The next Picking implementation plan is `V2-0020`, focused on creating a
requisition before LINE, status transitions, or problem reporting.

The create slice will:

- add a small nullable bridge from Picking lines to shared catalog products and
  aliases;
- import or sync only the Picking reference data needed for creation
  (`ProductName` aliases and `Staff`) into staging;
- keep full V1 Picking requisition history import deferred;
- use a server-side, transaction-safe write path for bill number allocation,
  requisition insert, line insert, and lifecycle event insert;
- keep LINE sending, capability token workflows, status postbacks, and problem
  reporting out of this slice.

## Rationale

Create requisition proves the highest-risk internal V2 behavior after the
read-only path: permissions, validation, daily counters, transaction safety,
line/event writes, and immediate read-after-write behavior.

LINE first would couple external notification behavior to an unproven database
write path. Status/problem first would require bills created elsewhere or
fixtures, which would hide write-path problems.

The shared catalog bridge prevents Picking from introducing a second product
master after `V2-0018` established shared catalog scope and aliases.

## Consequences

- `V2-0020` may include a small schema migration before UI work.
- Vercel Preview/Development may need a server-only transactional database env
  path before deployed write verification.
- Reference import scripts must be gated and staging-project checked.
- V1 Picking, GAS, Sheets, live URLs, LINE tokens, and production data remain
  untouched.
