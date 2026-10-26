---
paths:
  - "backend/ExpenseManagement.Api.Tests/**"
  - "frontend/src/**/*.test.tsx"
---

# Testing

## Structure
- Every test follows Arrange-Act-Assert, with `// Arrange`, `// Act` and `// Assert` comments. One behaviour per test.
- Name tests `Method_Scenario_Expected`, for example `CreateExpense_AmountHasThreeDecimals_Returns400`.
- Tag the requirement with `[Trait("Requirement", "FR-05 AC2")]` so `dotnet test --filter "Requirement=FR-05 AC2"` works.
- Vitest uses `describe('<Component or module>')` and `it('<scenario> → <expected>')`. Import `describe/it/expect` from `vitest`.

## Database isolation
- Integration tests use `WebApplicationFactory<Program>` with a dedicated `SqliteConnection("DataSource=:memory:")`
  that stays open for the factory's lifetime. Never use a file path, never use `expense-management.db`, and never share a connection between test classes.
- Each test seeds the data it needs. Never depend on another test's data or on run order.
- Unit tests for validators and `BudgetCalculator` use no database. Use a fixed `TimeProvider` for anything that depends on "today".

## Coverage per endpoint or feature
For each feature, cover at least:
- **success:** the status code, the body and the `Location` header on create
- **validation:** 400 with the expected `errors` key at each VR boundary (for example 0, 0.01, 1,000,000, 1,000,000.01, 10.123, 100 and 101 characters, tomorrow)
- **not found:** 404 for an unknown id
- **conflict:** 409 for a duplicate name or budget, or a category that still has expenses
- **budget:** Hard at the limit (201), Hard over the limit (422 and nothing saved), Soft over the limit (201 with a warning), and status at
  79.99, 80, 100 and 100.01 %
- **ProblemDetails:** `application/problem+json` content type and the required fields
- Frontend tests mock `fetch` at the `src/api` boundary and cover loading, empty, error and success rendering.

## Integrity
- Never weaken, skip (`Skip=`, `.skip`, `.only`), delete or loosen an assertion to make a test pass. Fix the code,
  or report the failing test and its cause.
- Don't change production behaviour just to make a test pass unless the requirement says so.
