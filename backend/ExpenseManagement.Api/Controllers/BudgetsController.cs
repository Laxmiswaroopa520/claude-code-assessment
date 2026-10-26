using ExpenseManagement.Api.Contracts;
using ExpenseManagement.Api.Infrastructure;
using ExpenseManagement.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace ExpenseManagement.Api.Controllers;

[ApiController]
[Route("api/budgets")]
public sealed class BudgetsController : ControllerBase
{
    private readonly IBudgetService _budgetService;

    public BudgetsController(IBudgetService budgetService)
    {
        _budgetService = budgetService;
    }

    [HttpGet]
    [ProducesResponseType<IReadOnlyList<BudgetResponse>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest, "application/problem+json")]
    public async Task<IActionResult> List([FromQuery] string? month, CancellationToken ct)
    {
        ServiceResult<IReadOnlyList<BudgetResponse>> result = await _budgetService.ListAsync(month, ct);
        return ServiceResultMapper.ToActionResult(this, result);
    }

    [HttpGet("{id:int}")]
    [ProducesResponseType<BudgetResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound, "application/problem+json")]
    public async Task<IActionResult> GetById(int id, CancellationToken ct)
    {
        ServiceResult<BudgetResponse> result = await _budgetService.GetAsync(id, ct);
        return ServiceResultMapper.ToActionResult(this, result);
    }

    [HttpPost]
    [ProducesResponseType<BudgetResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest, "application/problem+json")]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict, "application/problem+json")]
    public async Task<IActionResult> Create(BudgetRequest request, CancellationToken ct)
    {
        ServiceResult<BudgetResponse> result = await _budgetService.CreateAsync(request, ct);
        return ServiceResultMapper.ToActionResult(this, result, nameof(GetById), budget => new { id = budget.Id });
    }

    [HttpPut("{id:int}")]
    [ProducesResponseType<BudgetResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest, "application/problem+json")]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound, "application/problem+json")]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict, "application/problem+json")]
    public async Task<IActionResult> Update(int id, BudgetRequest request, CancellationToken ct)
    {
        ServiceResult<BudgetResponse> result = await _budgetService.UpdateAsync(id, request, ct);
        return ServiceResultMapper.ToActionResult(this, result);
    }

    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound, "application/problem+json")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        ServiceResult<bool> result = await _budgetService.DeleteAsync(id, ct);
        return ServiceResultMapper.ToActionResult(this, result);
    }
}
