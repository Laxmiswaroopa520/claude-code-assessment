# Endpoint done-checklist

Copy this list into your final report and tick each item. Anything unticked must be explained.

## Contract
- [ ] Route, method and query parameters match the requirements document exactly
- [ ] Request/response are `record` DTOs in the contracts folder; no EF entity is bound or returned
- [ ] JSON is camelCase; enums are serialised as strings; dates use `YYYY-MM-DD`
- [ ] `[ProducesResponseType]` attributes cover every success and error status

## Validation and rules
- [ ] Field rules live in a pure static validator; errors are keyed by field name
- [ ] Data-dependent checks (existence, uniqueness) are in the service
- [ ] "Today" comes from the injected `TimeProvider`
- [ ] Expected outcomes return the result type; nothing throws for validation, not found or conflict

## Controller
- [ ] One service call per action; no `DbContext`, LINQ or business `if` in the controller
- [ ] Create returns 201 with a `Location` header; delete returns 204
- [ ] Every error body is `application/problem+json` (400 includes `errors`)

## Data access
- [ ] All EF Core calls are async and take a `CancellationToken`
- [ ] Reads use `AsNoTracking()`; no raw SQL built from user input
- [ ] Schema changes were made in the model and generated with `dotnet ef migrations add`, never by hand

## Tests
- [ ] Unit tests cover each validator boundary on both sides
- [ ] Integration tests cover success, 400 (with field key), 404, 409 and 422 where they apply
- [ ] Tests use an isolated in-memory database and never the development database
- [ ] Each test has a requirement trait and an Arrange-Act-Assert body; none are skipped or weakened

## Delivery
- [ ] `.http` file has a request for each new or changed endpoint
- [ ] `dotnet build` passed with 0 warnings and 0 errors (output shown)
- [ ] `dotnet test` passed (real counts shown)
- [ ] Docs updated, or the needed doc changes are listed
