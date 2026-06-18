# Module Cutover Checklist

Use this checklist for every module before replacing V1 behavior with V2.

## Planning

- Module owner and scope identified.
- V1 source files and GAS actions inventoried.
- Sheets/tabs and columns mapped.
- Permission keys mapped.
- LINE notification behavior documented.
- Known V1 quirks listed.

## Data

- Staging import completed.
- Row counts reconciled.
- Required IDs validated.
- Dates and numeric values normalized.
- Legacy references preserved.
- Duplicate or malformed records reviewed.

## App Behavior

- Core happy paths verified.
- Edge cases from V1 handoff verified.
- Permission allow/deny behavior verified.
- Mobile layout verified for primary workflows.
- No secrets exposed to client code.

## Database Security

- RLS enabled where applicable.
- Policies reviewed.
- Required grants reviewed.
- Privileged operations are server-side.
- Audit logs capture sensitive mutations.

## Deployment

- Vercel Preview verified.
- Supabase staging verified.
- Production env vars prepared but not exposed.
- Rollback path documented.
- User approval received.

## Cutover

- V1 writes paused or redirected for the module.
- V2 production route enabled.
- Smoke test completed.
- Handoff updated.
- V1 module status documented as read-only/archive or fallback.
