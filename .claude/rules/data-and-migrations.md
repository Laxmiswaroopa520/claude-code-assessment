---
paths:
  - "backend/**/Data/**"
  - "backend/**/Domain/**"
  - "backend/**/Migrations/**"
---

# Data, domain and migrations

## Data access
- Use EF Core LINQ only. Never use `FromSqlRaw` or `ExecuteSqlRaw` with values that come from user input. If raw SQL is unavoidable, use
  `FromSqlInterpolated` and get approval first.
- Use `AsNoTracking()` for read-only queries. Project to the columns you need before materializing.

## Model configuration
- Configure entities with Fluent API in `Data/Configurations/*Configuration.cs` (`IEntityTypeConfiguration<T>`), applied via
  `ApplyConfigurationsFromAssembly`. Don't put EF attributes on `Domain/` classes.
- `decimal` money: `.HasPrecision(18, 2)` on `Expense.Amount` and `Budget.LimitAmount`.
- `Expense.Date` is `DateOnly`. Enums (`BudgetEnforcement`) are stored with `.HasConversion<string>()`.
- Both foreign keys (`Expense.CategoryId`, `Budget.CategoryId`) use `.OnDelete(DeleteBehavior.Restrict)`. Cascades are done
  explicitly in services.
- Unique indexes:
  - `Category.Name`, with `.UseCollation("NOCASE")` so the check is case-insensitive
  - `Budget(CategoryId, Year, Month)`
- Plain indexes: `Expense.Date` and `Expense.CategoryId`.
- Domain entities have no HTTP or serialization concerns. Keep only the fields listed in `docs/architecture.md` §3.

## Decimal aggregation (SQLite)
- SQLite stores `decimal` as TEXT, so **never** `OrderBy` or `Sum/Min/Max/Average` a decimal column inside an EF query.
- Filter in SQL, materialize with `ToListAsync(ct)`, then sort and aggregate the `decimal` values in C#.
- Never convert money to `double`/`float`, and never add a REAL value converter.

## Migrations
- Create migrations only with `dotnet ef migrations add <Name> --project backend/ExpenseManagement.Api`.
  Use PascalCase names that describe the change (`AddBudgetEnforcement`).
- Never hand-edit or delete files in `Migrations/`. To change the schema, change the model and add a new migration.
- Apply with `dotnet ef database update --project backend/ExpenseManagement.Api`. Never add `Database.Migrate()` at startup.
