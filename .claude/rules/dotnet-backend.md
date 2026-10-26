---
paths:
  - "backend/**/*.cs"
---

# .NET backend (C#)

## Types and async
- Declare every local with its explicit type. Never use `var`, not even for `new` expressions or LINQ results (NFR-04).
- Money is `decimal`, expense dates are `DateOnly`, and timestamps are `DateTime` in UTC. Nullable is enabled, so don't suppress warnings with `!` unless you've checked null right before.
- All I/O is `async`/`await` end to end. Use `Async` method names. Pass `CancellationToken ct` as the last parameter and forward it. Never use `.Result`, `.Wait()` or `async void`.
- Get "today" from the injected `TimeProvider`, never from `DateTime.Now`, `DateTime.UtcNow` or `DateOnly.FromDateTime(DateTime.Now)`.

## Dependency injection
- Constructor injection only, into `private readonly` fields. No service locators and no `new` for services.
- Register services in `Program.cs` as `AddScoped<IXService, XService>()`. `AppDbContext` is scoped.

## Controllers vs. services
- A controller action binds a contract, makes **one** service call, and returns
  `ServiceResultMapper.ToActionResult(this, result, …)`. No `if` over business rules, no `AppDbContext`, no LINQ.
- Services own every VR/BR rule and return `ServiceResult<T>`. They never throw for expected outcomes
  (validation, not found, conflict, hard-budget rejection); they return the matching `ServiceStatus`.
- Services never reference `IActionResult`, `HttpContext` or status codes.
- Validators and `BudgetCalculator` are pure `static` code with no database or clock access, so they can be unit-tested.

## Documentation
- Every public method on a service interface has XML doc comments: `<summary>`, `<param>` for each parameter, and `<returns>`.
  The `<returns>` must list the `ServiceStatus` values the method can produce.

```csharp
/// <summary>Creates an expense after validation and budget enforcement.</summary>
/// <param name="request">The expense to create.</param>
/// <param name="ct">Cancellation token.</param>
/// <returns>Created, ValidationFailed, or BudgetRejected (hard budget exceeded).</returns>
Task<ServiceResult<ExpenseResponse>> CreateAsync(CreateExpenseRequest request, CancellationToken ct);
```
