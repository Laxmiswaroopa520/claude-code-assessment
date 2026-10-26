---
paths:
  - "frontend/src/**"
---

# React + TypeScript client

## TypeScript
- Strict mode is on (the TS 6 default). Never add `"strict": false`, `// @ts-ignore` or `// @ts-expect-error` without a comment explaining why.
- No `any`, explicit or implicit. Use `unknown` and narrow it. Avoid non-null `!` unless an invariant guarantees it.
- API DTO types live in `src/types/` and mirror the backend `Contracts/` records (`Expense`, `Category`, `Budget`,
  `PagedResponse<T>`, `ProblemDetails`). Money is `number` and dates are `string` (`YYYY-MM-DD`).

## Where code goes
- `src/api/`: the **only** place that calls `fetch`. `client.ts` turns non-2xx `application/problem+json` into a typed
  `ApiError` (status, title, field `errors`, extensions). Use relative `/api/...` URLs; the Vite proxy forwards them.
- `src/hooks/`: data hooks (`useExpenses`, `useCategories`, …) that wrap `src/api` and expose `data`, `loading` and `error`,
  plus mutation functions.
- `src/components/`: presentational components that receive data and callbacks through props. No `fetch` here.
- `src/pages/`: compose hooks and components into a screen.

## UI states
- Every data view renders explicit **loading**, **empty** and **error** states.
- Map a 400 response to per-field messages next to the matching control. Show 409/422 `detail` as a form-level error.
- Show soft-budget `warnings[]` after a successful save. Don't treat them as errors.

## Accessibility
- Every input, select and textarea has a `<label htmlFor>` or `aria-label`. Field errors are linked with `aria-describedby`.
- Use `<button type="button|submit">` for actions, never a clickable `<div>`. Budget status is shown with text, not only color.

## Dependencies
- Don't add npm packages (UI kits, state or query libraries, date libraries) without my approval. Use React state and hooks
  and the platform `fetch`.
