---
name: aspnet-endpoint-workflow
description: Use when adding or changing an ASP.NET Core Web API endpoint (controller action, route, query parameters, request/response contract, validation or status codes) in a controllers + services + EF Core project. Walks contract → validation → service → thin controller → tests → .http sample → docs, and ends with a real build and test run.
---

# ASP.NET Core endpoint workflow

A reusable, project-independent workflow for one endpoint change in an ASP.NET Core Web API that uses
controllers, a service layer and EF Core. Project-specific facts (routes, limits, status codes, folder names)
come from the repository's `CLAUDE.md`, its rules and its requirements document, never from this skill.

Work through the steps in order. Each step says why it exists. Tick the items in [checklist.md](checklist.md)
before you report the change as done.

## 1. Read before you write
- Read the requirement (functional requirement and acceptance criteria) the change implements.
- Open one existing controller, its service interface and implementation, and its contracts. Copy their
  patterns: naming, result type, error mapping, DI registration, test layout.
- *Why:* consistency beats a new "better" pattern; reviewers check the change against the existing code.

## 2. Define the contract
- Request and response types are `record`s in the contracts folder. Never bind or return EF entities.
- Make request properties nullable when a missing value must produce a field-level validation message,
  instead of a generic model-binding failure.
- Query-string parameters bind to a small class marked `[FromQuery]`; route ids use a constraint such as `{id:int}`.
- *Why:* the contract is the public API. Changing it later breaks clients, so check it against the requirements now.

## 3. Validate in the service layer
- Put field rules in a pure, static validator (no database, no clock) that returns errors keyed by field name.
- Checks that need data (does the referenced row exist, is the name unique) live in the service.
- Get "today" from an injected `TimeProvider`, never `DateTime.Now`.
- *Why:* pure validators are cheap to unit-test at every boundary value.

## 4. Implement the service method
- One public interface method per use case, with XML docs listing the result statuses it can return.
- Return the project's result type (for example `ServiceResult<T>`) for expected outcomes: validation failed,
  not found, conflict, business-rule rejection. Do not throw for these.
- All EF Core calls are async and take a `CancellationToken`. Use `AsNoTracking()` for reads.
- Register the service in DI (`AddScoped<IService, Service>()`) if it is new.
- *Why:* business rules in one place keep controllers thin and make behaviour testable without HTTP.

## 5. Keep the controller thin
- The action binds the contract, makes one service call, and returns the shared result-to-HTTP mapper's output.
- No LINQ, no `DbContext`, no `if` over business rules in the controller.
- Status codes: 200 read/update, 201 + `Location` on create (`CreatedAtAction`), 204 delete, 400 validation
  (`ValidationProblemDetails`), 404 unknown id, 409 conflict, 422 business-rule rejection; every error is
  RFC 7807 `application/problem+json`.
- Add `[ProducesResponseType]` attributes so the OpenAPI document describes success and error bodies.
- *Why:* HTTP concerns in one place, business rules in another.

## 6. Test it
- Unit tests for the validator and any pure calculation: each boundary on both sides.
- Integration tests through `WebApplicationFactory<Program>` on an isolated in-memory database:
  success (status, body, `Location`), each validation rule (400 + the field key), not found (404),
  conflict (409), rule rejection (422), and the ProblemDetails content type.
- Arrange-Act-Assert, `Method_Scenario_Expected` names, a requirement trait on each test. Never weaken or skip a test.
- *Why:* the acceptance criteria are only met when a test proves them.

## 7. Add a sample request
- Add one request per success case and one per important error case to the project's `.http` file.
- *Why:* reviewers and assessors can run the endpoint without writing curl commands.

## 8. Build, test and report
- Run `dotnet build` and `dotnet test` for the solution. Report the real pass/fail counts. Never claim
  success without that output.
- If the contract or behaviour changed, update the requirements/architecture docs, or list what must change.
- Report: files changed, endpoints and status codes, tests added, commands run with their results.
