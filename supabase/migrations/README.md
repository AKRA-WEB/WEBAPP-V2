# `supabase/migrations`

Future Supabase migration files.

Do not hand-write timestamped migration filenames. When Supabase CLI is
available, create migration files through the CLI so migration history remains
consistent.

Every schema change should be reviewed for:

- RLS
- grants
- policies
- constraints
- legacy import requirements
- rollback impact
