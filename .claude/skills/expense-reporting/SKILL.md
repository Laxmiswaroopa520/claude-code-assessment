---
name: expense-reporting
description: Use when implementing, changing, debugging or reviewing monthly totals, category summaries, budget status (OnTrack/Warning/Exceeded, Hard/Soft enforcement) or the JSON/CSV monthly expense report in the AICC102 Expense Management API. Encodes the project's month boundaries, decimal rules, SQLite aggregation limits, response shapes, CSV format, MCP cross-check and required tests.
---

# Expense reporting rules (AICC102)

Project-specific rules for every calculation that turns expenses into totals, percentages, budget status or a
report. The contract is `docs/requirements.md` (FR-10 to FR-16, BR-01 to BR-08). If this skill and the
requirements disagree, the requirements win: stop and report the conflict instead of guessing.

Where the code lives (read it before changing anything):

| Concern | File |
|---|---|
| Month parsing and boundaries | `backend/ExpenseManagement.Api/Services/Validation/MonthKey.cs` |
| Money helpers (2 dp, rounding) | `backend/ExpenseManagement.Api/Services/Validation/MoneyRules.cs` |
| Budget status and Hard/Soft decision | `backend/ExpenseManagement.Api/Services/BudgetCalculator.cs` |
| Spent for a category-month | `backend/ExpenseManagement.Api/Services/SpendingQueries.cs` |
| Per-category summary rows | `backend/ExpenseManagement.Api/Services/CategorySummaryCalculator.cs`, `MonthSummaryLoader.cs` |
| Endpoints | `SummaryService.cs`, `ReportService.cs`, `SummariesController.cs`, `ReportsController.cs` |
| CSV escaping | `backend/ExpenseManagement.Api/Infrastructure/CsvWriter.cs` |

## 1. Month boundaries (BR-08)
- A month is `YYYY-MM` with year 2000–2100 and month 01–12. Parse it only with `MonthKey.TryParse`; anything
  else is a 400 keyed `month` (query) or `Month` (budget body).
- An expense belongs to the month of its `Date` (a `DateOnly`, calendar month, UTC). The range is inclusive:
  `FirstDay` (the 1st) to `LastDay` (28/29/30/31). Never use `DateTime` or time zones for this.
- "Today" for validation comes from the injected `TimeProvider`.

## 2. Money (BR-07)
- Money is `decimal` everywhere and `decimal(18,2)` in the database. Never `double`/`float`, never a REAL converter.
- Stored amounts already have at most 2 decimals, so sums of them are exact: do not round totals.
- Round only calculated percentages, to 2 places with `MidpointRounding.AwayFromZero` (`MoneyRules.RoundForOutput`).
- Format money in messages with `N2` and invariant culture (`1,050.00`); in CSV with `0.00` (`1050.00`).

## 3. SQLite aggregation limit
- SQLite stores `decimal` as TEXT. EF Core cannot translate `Sum`, `Min`, `Max`, `Average`, `OrderBy` or
  `<`/`>` comparisons on a decimal column. They throw at runtime.
- Pattern: filter in SQL on non-decimal columns (dates, ids, text), project only the needed columns,
  `ToListAsync(ct)`, then sum, compare and sort the `decimal` values in C#.

## 4. Budget status and enforcement (BR-01 to BR-05)
- `percentUsed = spent / limit × 100`. Below 80 is **OnTrack**, 80 to 100 inclusive is **Warning**, above 100 is **Exceeded**.
- On create and update, `projected = spent in the target category-month excluding the expense being updated + new amount`.
- **Hard:** `projected > limit` is rejected with **422** and nothing is saved. Exactly equal to the limit is allowed.
  The 422 ProblemDetails carries `categoryId`, `month`, `limit`, `currentSpent`, `attemptedAmount`.
- **Soft:** always saved. `warnings[]` gets `Budget exceeded for '<Category>' in <YYYY-MM>: <projected> / <limit>`
  when the status is Exceeded, or a `Budget warning …` message when it moves from OnTrack into Warning.
- No budget for that category-month: no check, `warnings: []`.
- Budget responses always include `spent`, `remaining` (`limit − spent`, may be negative), `percentUsed`, `status`.

## 5. Response shapes (do not change without updating the requirements)
- `GET /api/summaries/monthly?year=YYYY` → `[{ month, total, count }]` for months that have expenses, ascending.
  Missing or out-of-range year → 400 `year`. A year with no expenses → `[]`.
- `GET /api/summaries/categories?month=YYYY-MM` → one row per category, zero totals included, sorted by total
  descending, then name: `{ categoryId, categoryName, total, count, percentOfTotal, budgetLimit?, percentUsed?, status? }`.
  The budget fields are `null` when the category has no budget that month. An empty month returns zero rows, not 404.
- `GET /api/reports/monthly?month=YYYY-MM&format=json` (default json) →
  `{ month, from, to, generatedAt, grandTotal, expenseCount, categories[...], expenses[...] }`, expenses sorted by date then id.

## 6. CSV (FR-16)
- `format=csv` returns `text/csv` with `Content-Disposition: attachment; filename="expenses-YYYY-MM.csv"`.
  Any other format → 400 `format`.
- Header exactly `Date,Title,Category,Amount`; lines end with CRLF; UTF-8 without BOM.
- Dates `yyyy-MM-dd`, amounts `0.00`, both with invariant culture.
- RFC 4180: quote a field containing a comma, quote or line break, and double inner quotes.
- Security: prefix a text field that starts with `=`, `+`, `-`, `@`, tab or CR with `'` so spreadsheets can't run it.
  Always go through `CsvWriter.EscapeField`, never `string.Join` on raw values.

## 7. Cross-check against the database (MCP)
After implementing or changing a total, prove it with real data:
1. Refresh the read-only snapshot (online backup, safe while the API runs):
   `sqlite3 backend/ExpenseManagement.Api/expense-management.db ".backup '.claude/mcp/expense-snapshot.db'"`
2. Call the endpoint against the running API (`http://localhost:5200`).
3. With the `expense-db` MCP server's read-only query tool, run a SELECT on the snapshot for the same month:
   ```sql
   SELECT c.Name, COUNT(*) AS Count, ROUND(SUM(CAST(e.Amount AS REAL)), 2) AS Total
   FROM Expenses e JOIN Categories c ON c.Id = e.CategoryId
   WHERE e.Date BETWEEN '2026-10-01' AND '2026-10-31'
   GROUP BY c.Name ORDER BY Total DESC;
   ```
   (The REAL cast is acceptable here only for checking. It never goes into application code.)
4. Report both numbers side by side per category. They must match to the cent.
- Only `SELECT`/`PRAGMA` through MCP: never write. If `/mcp` does not show `expense-db` connected, say so and use
  `sqlite3 -readonly` on the snapshot instead. Never claim an MCP check you did not run.

## 8. Required tests
- Unit: status at 79.99 / 80 / 100 / 100.01 %; Hard at the limit (allowed) and over by 0.01 (rejected);
  Soft exceeded (warning); Soft OnTrack→Warning (warning); Soft Warning→Warning (no warning); zero limit;
  month boundaries including February in a leap year; percentage rounding (1/3 → 33.33).
- Integration: monthly totals ascending and an empty year; category summary with budget status and an empty
  month; JSON report totals and date range; CSV content type, file name, header, comma/quote escaping and
  formula neutralisation; 400 for a bad month or format.
- Tag each test with its requirement (`[Trait("Requirement", "FR-14 AC1")]`).
