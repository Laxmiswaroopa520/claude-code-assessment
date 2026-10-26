# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 1. Purpose and stack

AICC102 assessment: a local, single-user Expense Management REST API with a lean React client.
Expenses, categories, monthly budgets (Hard/Soft), summaries and JSON/CSV reports. No authentication, multi-user support or currencies.

| Layer | Version |
|---|---|
| ASP.NET Core Web API (controllers) | .NET SDK 10.0.100, `net10.0` |
| EF Core + SQLite | `Microsoft.EntityFrameworkCore.Sqlite` / `.Design` 10.0.11 |
| Backend tests | xUnit 2.9.3, `Microsoft.AspNetCore.Mvc.Testing` 10.0.11 |
| Client | React 19.3, TypeScript 6.0 (strict by default), Vite 8.3 |
| Client tests | Vitest 5.0, jsdom, React Testing Library |

The spec is `docs/requirements.md` (FR/VR/BR/NFR IDs) and `docs/architecture.md`. Read the relevant section before changing behaviour.

## 2. Run

Run backend commands from the repo root.
```bash
dotnet run --project backend/ExpenseManagement.Api --launch-profile http   # http://localhost:5200
cd frontend && npm run dev                                                 # http://localhost:5173
```
Vite proxies `/api` to `http://localhost:5200`, so start the API first. Don't use the `https` launch profile: its http port is 5050, which the proxy doesn't target.

## 3. Test

```bash
dotnet test backend
dotnet test backend --filter "FullyQualifiedName~ExpensesApiTests"   # single class
cd frontend && npm test                                              # vitest run
cd frontend && npx vitest run src/App.test.tsx                       # single file
cd frontend && npm run build                                         # also type-checks tests
```

## 4. Database

- **File:** `expenses.db` in `backend/ExpenseManagement.Api/`. It's git-ignored. *(Planned: the connection string isn't configured yet.)*
- **Create a migration:** `dotnet ef migrations add <Name> --project backend/ExpenseManagement.Api`
- **Apply:** `dotnet ef database update --project backend/ExpenseManagement.Api`. The API does **not** migrate on startup.
- **Never hand-edit `Migrations/`.** Change the model or configuration, then generate a new migration.
- **Never delete or reset `expenses.db`, or drop tables, without asking me first.**
- Tests use their own in-memory SQLite (`DataSource=:memory:`) and must never open the dev database.

## 5. Architecture

```
React (frontend/src/api/* is the only fetch caller)
  → Controllers (HTTP only) → Services (rules → ServiceResult<T>) → AppDbContext (EF Core) → SQLite
```
- **Controllers** bind contracts, call one service method, and map the result through `Infrastructure/ServiceResultMapper`. They never inject `AppDbContext` and never contain rules.
- **Services** own all validation and business rules and return `ServiceResult<T>` (Ok, Created, NoContent, ValidationFailed, NotFound, Conflict, BudgetRejected, plus warnings).
- **Money** is `decimal(18,2)`, stored as TEXT. SQLite can't `ORDER BY` or `Sum` decimals: filter in SQL, materialize with `AsNoTracking()`, then sort or aggregate in C#. **Never use `double`/`float` for money.**

| Folder | Holds |
|---|---|
| `backend/ExpenseManagement.Api/Controllers/` | Thin `[ApiController]`s: categories, expenses, budgets, summaries, reports |
| `…/Services/` | Service interfaces and implementations, `BudgetCalculator`, `ServiceResult`, `Validation/` |
| `…/Domain/` | `Category`, `Expense`, `Budget`, `BudgetEnforcement`, `BudgetStatus` |
| `…/Contracts/` | Request/response DTO records, `PagedResponse<T>` |
| `…/Data/` | `AppDbContext`, `Configurations/` (Fluent API), seed data |
| `…/Migrations/` | Generated only |
| `…/Infrastructure/` | `ServiceResultMapper`, `CsvWriter`, ProblemDetails setup |
| `backend/ExpenseManagement.Api.Tests/` | `Unit/` (validators, calculator, services) and `Integration/` (`WebApplicationFactory`) |
| `frontend/src/` | `types/`, `api/`, `hooks/`, `components/`, `pages/` |

For entities, the endpoint table and the test strategy, see `docs/architecture.md`.

## 6. Business rules

**Validation** (400 `ValidationProblemDetails`, keyed by field):
| Field | Rule |
|---|---|
| Expense amount | > 0, ≤ 1,000,000, at most 2 decimals |
| Expense date | Required, not after today (UTC; use the injected `TimeProvider`) |
| Expense title | 1–100 chars, trimmed |
| Expense categoryId | Must exist (else 400 on `CategoryId`) |
| Category name | 1–50 chars, unique case-insensitively (duplicate → 409) |
| Budget limit | > 0, at most 2 decimals. One budget per category per month (duplicate → 409) |
| Paging | `page` ≥ 1, `pageSize` 1–100. `sortBy` is date, amount or title. `from` ≤ `to` |

**Budgets:**
- **Status:** `pct = spent / limit × 100`. Below 80 is **OnTrack**, 80–100 is **Warning**, above 100 is **Exceeded**.
- **Hard:** a create or update that makes the month's category spending **> limit** returns **422** and saves nothing. Spending exactly equal to the limit is allowed.
- **Soft:** always saved (201/200), with a `warnings[]` message when the status moves to Warning or becomes Exceeded.
- **Updates:** exclude the expense's old amount and check the *target* category and month.

**Status codes:**
- **409:** a duplicate category name, a duplicate budget, or deleting a category that has expenses. Deleting a category with no expenses also deletes its budgets.
- **422:** a hard budget would be exceeded. ProblemDetails extensions: `categoryId`, `month`, `limit`, `currentSpent`, `attemptedAmount`.
- **404:** unknown id. **500:** ProblemDetails with a `traceId` and no stack trace.

## 7. Coding conventions

- **C# types:** use explicit types instead of `var` where practical. Nullable is enabled. `DateOnly` for expense dates. `decimal` for money.
- **Async:** every EF Core call is async (`ToListAsync`, `SaveChangesAsync`, …) and takes a `CancellationToken`. Use `AsNoTracking()` for reads.
- **DTOs:** `record` types in `Contracts/`. Never return or bind EF entities.
- **Errors:** every error response is RFC 7807 ProblemDetails, produced via `AddProblemDetails()` and the mapper. Never return ad-hoc `{ error }` bodies.
- **Entity configuration:** Fluent API in `Data/Configurations/`, not attributes.
- **Tests:** name tests `Method_Scenario_Expected` and tag each with `[Trait("Requirement", "FR-xx ACn")]`. Each integration test class gets its own in-memory SQLite connection.
- **TypeScript:** no `any`. DTO types in `src/types/`. Map ProblemDetails to typed errors in `src/api/client.ts`. Vitest globals are off, so import `describe/it/expect`.

## 8. Claude Code workflow

| Feature | Use it for | Status |
|---|---|---|
| Rule `.claude/rules/dotnet-backend.md` | `backend/**/*.cs`: explicit types, async, constructor DI, thin controllers, `ServiceResult<T>`, XML docs on service methods | active |
| Rule `.claude/rules/api-design.md` | `Controllers/**`, `Contracts/**`: routes, DTO records, status-code table, ProblemDetails, paging shape | active |
| Rule `.claude/rules/data-and-migrations.md` | `Data/**`, `Domain/**`, `Migrations/**`: Fluent API, precision, `Restrict`, unique indexes, decimal-in-C#, `dotnet ef` only | active |
| Rule `.claude/rules/react-typescript.md` | `frontend/src/**`: strict TS, `types/`, `api/`, `hooks/`, UI states, a11y, no new libraries | active |
| Rule `.claude/rules/testing.md` | Test project and `*.test.tsx`: AAA, `Method_Scenario_Expected`, in-memory SQLite, coverage list | active |
| Rule `.claude/rules/security.md` | Everywhere (no `paths:`): secrets, input validation, destructive ops, read-only MCP, repo-only scope | active |
| Skill `aspnet-endpoint-workflow` | **Any new or changed endpoint:** contract → validator → service → controller → tests → `.http` sample | planned |
| Skill `expense-reporting` | **Summaries and reports:** monthly totals, category summaries, JSON/CSV export | planned |
| Subagent `api-implementer` | Delegate backend implementation work | planned |
| Subagent `qa-reviewer` | Independent verification: run tests and review against the requirements and rules. Must not edit files. | planned |
| MCP `expense-db` (SQLite) | **Read-only** data checks (schema, seed data, totals). Never write through it. | planned |
| Pre-hook | Blocks dangerous commands (`rm -rf`, force push, `DROP`, unscoped `DELETE`) and edits to `.env*`, `*.db`, `Migrations/` | planned |
| Post-hook | Build or format check after edits to `*.cs` / `*.ts(x)` | planned |
| Cognine React plugin | React skills and audit commands for `frontend/` | installed (`.claude/settings.json`) |

The Cognine plugin's hooks call `python3`. On this machine that's the Windows Store stub, so they may not run. Never edit the read-only demo project `C:\Users\Laxmi Bandaru\claude-code-workshop`.

## 9. Definition of done

1. `dotnet build backend` passes with 0 errors, `dotnet test backend` passes, and `npm run build` and `npm test` in `frontend/` pass.
2. New or changed behaviour has tests that reference its FR/AC IDs.
3. Every new or changed endpoint has a request in `backend/ExpenseManagement.Api/ExpenseManagement.Api.http`.
4. If behaviour changed, `docs/requirements.md` is updated (and `docs/architecture.md` if the design changed).
5. No `var`-heavy code, `double` money, controller-level `DbContext` use, or non-ProblemDetails errors were introduced.
