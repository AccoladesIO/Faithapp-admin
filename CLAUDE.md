# Faithapp Admin — Standing Rules

## What This Project Is
Next.js 16 admin frontend for the Discovery Hub church management API.
Stack: Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · Axios · Lucide React · PWA (`@ducanh2912/next-pwa`).

The companion API lives at `/Users/jeremiahayeni/WebstormProjects/discovery-hub` (NestJS, all routes under `/v1/`).
API base URL is driven by `NEXT_PUBLIC_API_URL` — never hardcode it.

---

## Folder Conventions

| Folder | Purpose |
|---|---|
| `app/` | Next.js App Router pages. Each feature gets its own subfolder with `layout.tsx` + `page.tsx`. |
| `components/` | Shared/reusable UI components. Feature-specific components live inside their own subfolder. |
| `hooks/` | Data-fetching hooks — one file per API module (`use-members.ts`, `use-events.ts`, …). |
| `context/` | React context providers (currently only `auth-context.tsx`). |
| `utils/` | Pure utilities and the axios client. |

---

## Hook Pattern (MANDATORY)

All data hooks live in `hooks/use-{module}.ts` and follow this shape:

```typescript
import { useState, useEffect, useCallback } from "react";
import { api } from "@/utils/auth/axios-client";

// 1. Define all interface types at the top of the file
export interface MyEntity { id: string; /* ... */ }
export interface MyEntityPagination { page: number; limit: number; totalCount: number; totalPages: number; }

// 2. Export a single named hook function
export function useMyModule(defaultLimit = 10) {
  const [items, setItems] = useState<MyEntity[]>([]);
  const [pagination, setPagination] = useState<MyEntityPagination | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // fetch with useCallback; clear list before fetch so skeleton shows
  const fetchItems = useCallback(async (targetPage = 1) => { /* ... */ }, [defaultLimit]);

  // mutations return the updated entity and update local state optimistically
  const createItem = useCallback(async (payload: CreateDto): Promise<MyEntity> => { /* ... */ }, []);

  useEffect(() => { fetchItems(1); }, [fetchItems]);

  return { items, pagination, isLoading, isSubmitting, error, refetch: () => fetchItems(1), /* mutations */ };
}
```

**API response shape** — the API always wraps responses:
- Single item: `res.data?.data` → entity
- Paginated list: `res.data?.data` → `{ data: Entity[], page, limit, totalCount, totalPages }`
- Error message: `err?.response?.data?.message || err?.message`

---

## Auth
- `api` from `@/utils/auth/axios-client` auto-attaches the Bearer token and handles 401 → refresh → retry.
- Use `api` for all API calls. Never import axios directly for API requests.
- Auth state lives in `context/auth-context.tsx` — use `useAuth()` to read `isAuthenticated` / `isLoading`.

---

## Church-Agnostic Rule
Never hardcode a specific church name, address, or branding. Use generic language ("your church", "the congregation") or env var references.

---

## Next.js Version Warning
**This is Next.js 16 (App Router).** APIs, conventions, and file structure may differ from your training data.
Read `node_modules/next/dist/docs/` before writing code involving routing, layouts, or server components.
Always add `"use client"` to components that use hooks, event handlers, or browser APIs.

---

## Code Style
- No comments unless the WHY is non-obvious.
- No trailing `// end of X` block comments.
- Prefer Tailwind utility classes; avoid inline `style={}` unless truly dynamic.
- Use Lucide React for icons — import individual icons, not the whole package.
- No `async/await` on fire-and-forget side effects inside hooks.

---

## UI Patterns (MANDATORY)

### Click hint on table pages
Every page that renders a table where clicking a row opens a side panel **must** show a click hint below the grid when no panel is open and there is at least one row:
```tsx
{!panelOpen && items.length > 0 && (
    <div className="lg:col-span-12 flex items-center justify-center gap-2 text-xs text-[#8A817C] font-light py-2">
        <MousePointerClick className="w-3.5 h-3.5 shrink-0" />
        Click any row to view details
    </div>
)}
```

### Error banners
Always use `<DismissibleError message={error} />` from `@/components/ui/dismissible-error` for all error displays. Never render raw `{error && <div>...</div>}` blocks. The component auto-dismisses after 4 s and has an X close button.

### Optional UUID fields
When a select/dropdown maps to a UUID field that is optional on the backend, **never send an empty string**. Map `""` to `null`:
- Initial state: `fieldId: existingValue ?? null` (not `?? ""`)
- onChange: `fieldId: e.target.value === "" ? null : e.target.value`

Sending `""` for a UUID field causes backend class-validator to throw `"fieldId must be a UUID"`.

---

## Definition of Done
A frontend task is complete when:
1. The feature works against the live API (run `npm run dev` and verify manually).
2. TypeScript compiles with no errors (`npm run build`).
3. Types in the hook match the actual API response shape from the discovery-hub controller/DTOs.
