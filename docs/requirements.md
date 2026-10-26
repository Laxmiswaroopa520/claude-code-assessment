# AICC102 — Expense Management API: Requirements

| | |
|---|---|
| **Stack** | ASP.NET Core Web API (.NET 10, controllers) · EF Core + SQLite · xUnit · React + TypeScript (Vite) · Vitest |
| **Base URL** | `http://localhost:5200/api` (local only) |
| **Errors** | RFC 7807 `application/problem+json` (see §4) |
| **Evidence** | Screenshots and logs go in `docs/evidence/` |

---

## 1. Domain model

| Entity | Fields |
|---|---|
| **Category** | `Id` (int), `Name` (string, unique), `Description` (string?, ≤ 250) |
| **Expense** | `Id` (int), `Title` (string), `Amount` (decimal(18,2)), `Date` (DateOnly), `CategoryId` (int, FK), `Notes` (string?, ≤ 500), `CreatedAt` (DateTime UTC) |
| **Budget** | `Id` (int), `CategoryId` (int, FK), `Month` (string `YYYY-MM`), `Limit` (decimal(18,2)), `Type` (enum `Hard` \| `Soft`) |

`BudgetStatus` enum: `OnTrack` \| `Warning` \| `Exceeded`.

---

## 2. Validation rules

A validation failure returns **400** with a `ValidationProblemDetails` body. Its `errors` dictionary is keyed by field name.

| ID | Field | Rule |
|---|---|---|
| VR-01 | `Expense.Amount` | Required. Must be > 0 and ≤ 1,000,000, with at most 2 decimal places. |
| VR-02 | `Expense.Date` | Required. A valid `YYYY-MM-DD` date that is not later than today (UTC). |
| VR-03 | `Expense.Title` | Required. 1–100 characters after trimming; whitespace-only is rejected. |
| VR-04 | `Expense.CategoryId` | Required. Must refer to an existing category (an unknown ID is a 400 on the field). |
| VR-05 | `Category.Name` | Required. 1–50 characters after trimming. Unique, case-insensitive. A duplicate returns **409**. |
| VR-06 | `Budget.Limit` | Required. Must be > 0, with at most 2 decimal places. |
| VR-07 | `Budget.Month` | Required. Format `YYYY-MM` with month 01–12. |
| VR-08 | `Budget` uniqueness | Only one budget per (`CategoryId`, `Month`). A duplicate returns **409**. |
| VR-09 | `Budget.Type` | Required. Must be `Hard` or `Soft`. |
| VR-10 | Query: paging | `page` ≥ 1 (default 1). `pageSize` 1–100 (default 20). |
| VR-11 | Query: ranges | `from` must be ≤ `to`, and `minAmount` must be ≤ `maxAmount`. Violations return 400. |
| VR-12 | Query: sort | `sortBy` ∈ {`date`, `amount`, `title`} (default `date`). `sortDir` ∈ {`asc`, `desc`} (default `desc`). |

---

## 3. Business rules

| ID | Rule |
|---|---|
| BR-01 | **Budget status.** `pct = spent / limit × 100` for a category in a month. If `pct` < 80 the status is `OnTrack`. If 80 ≤ `pct` ≤ 100 it is `Warning`. If `pct` > 100 it is `Exceeded`. |
| BR-02 | **Hard budget.** A create or update that would make the month's spending for the category **greater than** the limit is rejected with **422** and nothing is saved. Spending exactly equal to the limit is allowed. |
| BR-03 | **Soft budget.** The same situation is accepted (201/200) and the response includes a `warnings[]` entry, e.g. `"Budget exceeded for 'Food' in 2026-10: 1,050.00 / 1,000.00"`. A warning is also returned when the status moves into `Warning`. |
| BR-04 | **Budget check on update.** The check excludes the expense's previous amount. It also applies to the target category and month when an update moves the expense to a different category or month. |
| BR-05 | **No budget.** If the category has no budget for the month, the expense is always accepted and no warning is returned. |
| BR-06 | **Category delete guard.** A category that has expenses cannot be deleted and returns **409**. Deleting a category that has no expenses also deletes its budgets. |
| BR-07 | **Money.** Amounts are stored as `decimal(18,2)` and calculations use `decimal`, never `double`. |
| BR-08 | **Month boundaries.** An expense belongs to the month of its `Date` (calendar month, UTC). |

---

## 4. Error handling

| Situation | Status | Body |
|---|---|---|
| Validation failure | 400 | `ValidationProblemDetails` with `errors` |
| Resource not found | 404 | `ProblemDetails`, `title: "Not Found"` |
| Duplicate category name or duplicate budget, category in use | 409 | `ProblemDetails` with a `detail` explaining the conflict |
| Hard budget exceeded | 422 | `ProblemDetails` with extensions `categoryId`, `month`, `limit`, `currentSpent`, `attemptedAmount` |
| Unhandled exception | 500 | `ProblemDetails` without a stack trace. The `traceId` extension is included. |

Every error body has `type`, `title`, `status`, `instance` and `traceId`. Errors are produced in one place, through `AddProblemDetails` and an exception handler, not in each controller.

---

## 5. Functional requirements

Each acceptance criterion (AC) is written as **input → status → result** and corresponds to at least one automated test.

### Categories

**FR-01 Create category.** `POST /api/categories`
- AC1: `{"name":"Food"}` → **201**. The response contains the body with an `id` and a `Location` header.
- AC2: `{"name":""}` or a 51-character name → **400** with `errors.Name`.
- AC3: `{"name":"food"}` when "Food" already exists → **409**.

**FR-02 List and get categories.** `GET /api/categories`, `GET /api/categories/{id}`
- AC1: A list request → **200** with an array sorted by name.
- AC2: An unknown id → **404** ProblemDetails.

**FR-03 Update category.** `PUT /api/categories/{id}`
- AC1: A valid new name → **200** with the updated record.
- AC2: A name that duplicates another category → **409**. An unknown id → **404**.

**FR-04 Delete category.** `DELETE /api/categories/{id}`
- AC1: A category with no expenses → **204**. A later GET → **404**.
- AC2: A category with ≥ 1 expense → **409**, and the category still exists.

### Expenses

**FR-05 Create expense.** `POST /api/expenses`
- AC1: A valid body (title, amount 12.50, today's date, existing categoryId) → **201** with the expense, `warnings: []` and a `Location` header.
- AC2: Each of amount 0, −1, 1000000.01, 10.123, a future date, a missing date, an empty title or a 101-character title → **400** naming the field.
- AC3: An unknown categoryId → **400** with `errors.CategoryId`.

**FR-06 Get expense.** `GET /api/expenses/{id}`
- AC1: An existing id → **200**. An unknown id → **404**.

**FR-07 Update expense.** `PUT /api/expenses/{id}`
- AC1: A valid body → **200** with the updated expense and `warnings`.
- AC2: An invalid body → **400**. An unknown id → **404**.

**FR-08 Delete expense.** `DELETE /api/expenses/{id}`
- AC1: An existing id → **204**. A repeated delete → **404**.

**FR-09 Search, filter, sort, page.** `GET /api/expenses?q=&categoryId=&from=&to=&minAmount=&maxAmount=&sortBy=&sortDir=&page=&pageSize=`
- AC1: No parameters → **200** with `{ items, page:1, pageSize:20, totalCount, totalPages }`, sorted by date descending.
- AC2: `q=taxi` matches a case-insensitive substring of the title or notes. Each other filter narrows the results, and filters combine with AND.
- AC3: `sortBy=amount&sortDir=asc` → items sorted by amount ascending.
- AC4: `pageSize=101`, `page=0`, `from` later than `to`, or `sortBy=foo` → **400**.
- AC5: A page beyond the last page → **200** with empty `items` and the correct `totalCount`.

### Budgets

**FR-10 Budget CRUD.** `POST/GET/PUT/DELETE /api/budgets[/{id}]`, plus `GET /api/budgets?month=YYYY-MM`
- AC1: `{"categoryId":1,"month":"2026-10","limit":500,"type":"Hard"}` → **201**.
- AC2: A second budget for the same category and month → **409**.
- AC3: limit ≤ 0, month `2026-13` or an unknown type → **400**.
- AC4: A GET includes the calculated `spent`, `remaining`, `percentUsed` and `status` (BR-01).

**FR-11 Hard budget enforcement.** A category has a Hard budget with a 100.00 limit and 90.00 already spent.
- AC1: A new expense of 10.00 → **201** (exactly at the limit). The status is `Warning`.
- AC2: A new expense of 10.01 → **422** ProblemDetails, and the expense count does not change.

**FR-12 Soft budget warning.** The same setup with a Soft budget.
- AC1: A new expense of 20.00 → **201**. The `warnings[]` list contains a budget-exceeded message, and the status is `Exceeded`.

### Summaries and reports

**FR-13 Monthly totals.** `GET /api/summaries/monthly?year=2026`
- AC1: → **200** with `[{ month:"2026-01", total, count }, …]` for months that have expenses, sorted ascending.

**FR-14 Category summary.** `GET /api/summaries/categories?month=2026-10`
- AC1: → **200** with one row per category: `categoryId`, `categoryName`, `total`, `count`, `budgetLimit?`, `percentUsed?` and `status?`. Totals match the sum of the seeded data.
- AC2: An invalid month → **400**.

**FR-15 Report (JSON).** `GET /api/reports/monthly?month=2026-10&format=json`
- AC1: → **200** `application/json` with `{ month, grandTotal, categories[…], expenses[…] }`.

**FR-16 Report (CSV).** `GET /api/reports/monthly?month=2026-10&format=csv`
- AC1: → **200** `text/csv` with `Content-Disposition: attachment; filename="expenses-2026-10.csv"`.
- AC2: The header row is `Date,Title,Category,Amount`. Values containing commas or quotes are RFC 4180-escaped. Amounts use invariant culture with 2 decimals.
- AC3: `format=xml` → **400**.

### Platform

**FR-17 Persistence.** The data is stored in SQLite and the schema is created only by EF Core migrations. Seed data covers a few categories, budgets and expenses.
- AC1: `dotnet ef database update` on an empty folder creates the database. The API starts and `GET /api/categories` returns the seeded rows.

**FR-18 API docs.** OpenAPI document and UI available in Development. An `.http` file contains sample requests for every endpoint.
- AC1: `GET /openapi/v1.json` → **200**. Every sample request in the `.http` file runs successfully against a fresh database.

**FR-19 React client.** A lean Vite + React + TypeScript app.
- AC1: Lists expenses with filters and paging, plus create, edit and delete forms that show validation errors from the API.
- AC2: Manages categories and budgets, and shows the budget status (OnTrack / Warning / Exceeded) for the selected month.
- AC3: Shows soft-budget warnings after a save and shows a hard-budget 422 as an error. It can download the CSV report.
- AC4: The API base URL comes from `VITE_API_URL`. CORS allows only the Vite dev origin.

**FR-20 Automated tests.**
- AC1: xUnit unit tests cover the validation and budget rules. Integration tests use `WebApplicationFactory` with an in-memory SQLite connection and cover every FR-01…FR-16 AC.
- AC2: Vitest tests cover the client's API wrapper and at least the expense form validation display.
- AC3: `dotnet test` and `npm test` both pass.

---

## 6. Non-functional requirements

| ID | Requirement |
|---|---|
| NFR-01 | **Local only.** Runs on localhost. No cloud resources, deployment or external services at runtime. |
| NFR-02 | **No secrets in git.** The connection string uses a local file path only. `.gitignore` excludes `*.db`, `bin/`, `obj/`, `node_modules/`, `.env*` and `appsettings.*.local.json`. |
| NFR-03 | **Layered design.** Controllers (HTTP only) → Services (business rules) → Data (EF Core `DbContext`). DTOs are separate from entities. Controllers never use `DbContext` directly. |
| NFR-04 | **Explicit C# types.** No `var`; explicit types everywhere. Nullable reference types are enabled. `decimal` is used for money and `DateOnly` for expense dates. |
| NFR-05 | **Async I/O.** All database access is async and takes a `CancellationToken`. |
| NFR-06 | **Quality gates.** The build has 0 warnings (`TreatWarningsAsErrors` in the API project). Tests run green before every commit. |
| NFR-07 | **Performance (indicative).** List endpoints respond in < 300 ms on 10k expenses locally. Indexes exist on `Expense.Date`, `Expense.CategoryId` and the unique `(Budget.CategoryId, Month)`. |
| NFR-08 | **Reproducible setup.** The README gives clone → run steps for the API and the client in ≤ 5 commands each. |

---

## 7. Out of scope

- Authentication and authorization (no users, logins, tokens or roles)
- Multiple users or tenants; there is a single data set
- Multiple currencies, currency conversion and FX rates; one implicit currency
- Recurring expenses, attachments and receipts, import
- Deployment, containerization and production hosting
- Report formats other than JSON and CSV (no PDF or Excel)

---

## 8. Claude Code features: usage and demonstration

| # | Feature | How it is used | How it is demonstrated (evidence in `docs/evidence/`) |
|---|---|---|---|
| 1 | **CLAUDE.md** | Root file with the project overview, stack, build/test commands, layering, coding conventions (explicit types, ProblemDetails) and pointers to the rules. | The file is in the repo. A screenshot shows Claude following its conventions without being prompted. |
| 2 | **Rules** (`.claude/rules/*.md`) | Path-scoped rules: `api.md` (controllers thin, ProblemDetails, status codes), `csharp.md` (no `var`, decimal money), `tests.md` (AC-named tests), `client.md` (TS strict, no `any`). | The rule files are present. A screenshot shows a rule being applied when editing a matching path. |
| 3 | **Skill: reusable** | `rest-endpoint-tests`: a generic skill that turns an endpoint spec plus acceptance criteria into xUnit `WebApplicationFactory` integration tests. It works in any ASP.NET Core repo. | `SKILL.md` is present. A transcript or screenshot shows it generating tests for FR-09. |
| 4 | **Skill: project-specific** | `add-expense-feature`: the project workflow for a new FR (DTO → validator → service → controller → migration if needed → tests → `.http` sample → client hook), following this repo's layout. | `SKILL.md` is present. A screenshot shows it used to implement a feature such as FR-16 CSV. |
| 5 | **Subagent 1** | `code-reviewer` (read-only tools): reviews diffs against CLAUDE.md, the rules and this requirements document, and flags layering or validation gaps. | `.claude/agents/code-reviewer.md` exists. A screenshot shows its review output on a change. |
| 6 | **Subagent 2** | `test-runner`: runs `dotnet test` and `npm test`, summarizes failures and maps them back to FR/AC IDs. | `.claude/agents/test-runner.md` exists. A screenshot shows its summary. |
| 7 | **MCP integration** | SQLite MCP server configured in `.mcp.json` so Claude can inspect the schema and data in `expense-management.db` (to verify migrations, seed data and budget totals). | `.mcp.json` is present. A screenshot shows a `/mcp` connection and a query result. |
| 8 | **Pre-hook** (`PreToolUse`) | Blocks edits to secrets or generated files (`.env*`, `*.db`, `Migrations/*` edited by hand) and dangerous Bash (`rm -rf`, `git push --force`). It exits 2 with a reason. | The hook script and settings entry are present. A screenshot shows a blocked attempt. |
| 9 | **Post-hook** (`PostToolUse`) | After `Edit`/`Write` on `*.cs`, runs `dotnet format --include <file>` and `dotnet build`. For `*.ts(x)`, runs `npx prettier`/`tsc --noEmit`. Failures are reported back to Claude. | The hook script is present. A screenshot shows automatic formatting or a build error being fixed. |
| 10 | **Cognine Marketplace plugin** | Add the Cognine marketplace (`/plugin marketplace add …`) and install the plugin named in the course material. Use it during development. | `/plugin` list screenshot plus usage output. The plugin name and source are recorded in the README. |

---

## 9. Assumptions

- "Today" for date validation means the UTC date on the server.
- Unknown `categoryId` on an expense returns 400 (an input error), not 404.
- A hard budget allows spending exactly equal to the limit; only spending above the limit returns 422.
- A soft budget also returns a warning when a save moves the status into `Warning` (≥ 80%).
- Budget `Limit` uses the same 2-decimal precision as `Amount`. No upper limit is set beyond `decimal(18,2)`.
