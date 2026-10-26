---
paths:
  - "backend/**/Controllers/**"
  - "backend/**/Contracts/**"
---

# API design (controllers and contracts)

## Routes
- Plural, lowercase resource names under `/api`: `[Route("api/expenses")]`, `api/categories`, `api/budgets`,
  `api/summaries/…`, `api/reports/…`. Ids go in the path (`{id:int}`); filters, sort and paging go in the query string.
- Use `[ApiController]` on every controller. Don't add endpoints beyond the inventory in `docs/architecture.md` §4 without updating it.

## Contracts
- Requests and responses are `record` types in `Contracts/` (`CreateExpenseRequest`, `ExpenseResponse`, …).
  Never bind or return a `Domain/` entity.
- JSON is camelCase. Money is serialized as a number and dates as `YYYY-MM-DD`. A budget month in the API is `"YYYY-MM"`.
- Responses for expense create/update include `warnings: string[]`, which is empty when there are none.

## Status codes
| Situation | Status |
|---|---|
| Read / update succeeded | 200 |
| Created | 201 + `Location` header (`CreatedAtAction(nameof(GetById), …)`) |
| Deleted | 204, no body |
| Validation failure | 400 `ValidationProblemDetails` (`errors` keyed by field) |
| Unknown id | 404 |
| Duplicate name or budget; category still has expenses | 409 |
| Hard budget would be exceeded | 422 |

## Errors
- Every non-2xx body is `application/problem+json` with `type`, `title`, `status`, `detail`, `instance` and `traceId`.
- 422 adds the extensions `categoryId`, `month`, `limit`, `currentSpent` and `attemptedAmount`.

## Paging
- `GET` list endpoints that page return
  `{ "items": [...], "page": 1, "pageSize": 20, "totalCount": 57, "totalPages": 3 }` (`PagedResponse<T>`).
- Defaults: `page=1`, `pageSize=20`. `pageSize` is capped at 100. Out-of-range values return 400, never a silent clamp.
