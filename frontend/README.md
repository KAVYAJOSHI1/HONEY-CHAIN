# Honey Chain — frontend

Next.js 14 (App Router) + Tailwind. See the [root README](../README.md) for setup.

- `src/app/(portal)/` — operator pages sharing the sidebar shell (beekeeper, KVIC admin, system)
- `src/app/consumer/`, `src/app/verify/` — public verification pages
- `src/components/ui/` — design-system primitives; theme tokens live in `src/app/globals.css`
- `src/lib/api.ts` — typed API client (`NEXT_PUBLIC_API_URL`), `src/hooks/useApi.ts` — fetch + polling
