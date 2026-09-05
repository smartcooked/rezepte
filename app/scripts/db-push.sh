#!/bin/zsh
# Spielt die Migrationen aus ../supabase/migrations in das verknüpfte Supabase-Projekt ein.
set -e
cd "$(dirname "$0")/.."
set -a; source .env; set +a
export PATH="$HOME/.local/node/bin:$PATH"
cd ..
npx --yes supabase@latest link --project-ref "$SUPABASE_PROJECT_REF" --password "$SUPABASE_DB_PASSWORD"
npx --yes supabase@latest db push --password "$SUPABASE_DB_PASSWORD"
