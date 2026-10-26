using ExpenseManagement.Api.Contracts;
using ExpenseManagement.Api.Infrastructure;
using ExpenseManagement.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace ExpenseManagement.Api.Controllers;

[ApiController]
[Route("api/expenses")]
public sealed class ExpensesController : ControllerBase
{
    private readonly IExpenseService _expenseService;

    public ExpensesController(IExpenseService expenseService)
    {
        _expenseService = expenseService;
    }

    [HttpGet]
    [ProducesResponseType<PagedResponse<ExpenseResponse>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest, "application/problem+json")]
    public async Task<IActionResult> List([FromQuery] ExpenseQuery query, CancellationToken ct)
    {
        ServiceResult<PagedResponse<ExpenseResponse>> result = await _expenseService.ListAsync(query, ct);
        return ServiceResultMapper.ToActionResult(this, result);
    }

    [HttpGet("{id:int}")]
    [ProducesResponseType<ExpenseResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound, "application/problem+json")]
    public async Task<IActionResult> GetById(int id, CancellationToken ct)
    {
        ServiceResult<ExpenseResponse> result = await _expenseService.GetAsync(id, ct);
        return ServiceResultMapper.ToActionResult(this, result);
    }

    [HttpPost]
    [ProducesResponseType<ExpenseResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest, "application/problem+json")]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status422UnprocessableEntity, "application/problem+json")]
    public async Task<IActionResult> Create(ExpenseRequest request, CancellationToken ct)
    {
        ServiceResult<ExpenseResponse> result = await _expenseService.CreateAsync(request, ct);
        return ServiceResultMapper.ToActionResult(this, result, nameof(GetById), expense => new { id = expense.Id });
    }

    [HttpPut("{id:int}")]
    [ProducesResponseType<ExpenseResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest, "application/problem+json")]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound, "application/problem+json")]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status422UnprocessableEntity, "application/problem+json")]
    public async Task<IActionResult> Update(int id, ExpenseRequest request, CancellationToken ct)
    {
        ServiceResult<ExpenseResponse> result = await _expenseService.UpdateAsync(id, request, ct);
        return ServiceResultMapper.ToActionResult(this, result);
    }

    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound, "application/problem+json")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        ServiceResult<bool> result = await _expenseService.DeleteAsync(id, ct);
        return ServiceResultMapper.ToActionResult(this, result);
    }
}
