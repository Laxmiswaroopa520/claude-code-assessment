using ExpenseManagement.Api.Contracts;
using ExpenseManagement.Api.Infrastructure;
using ExpenseManagement.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace ExpenseManagement.Api.Controllers;

[ApiController]
[Route("api/summaries")]
public sealed class SummariesController : ControllerBase
{
    private readonly ISummaryService _summaryService;

    public SummariesController(ISummaryService summaryService)
    {
        _summaryService = summaryService;
    }

    [HttpGet("monthly")]
    [ProducesResponseType<IReadOnlyList<MonthlyTotalResponse>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest, "application/problem+json")]
    public async Task<IActionResult> Monthly([FromQuery] int? year, CancellationToken ct)
    {
        ServiceResult<IReadOnlyList<MonthlyTotalResponse>> result = await _summaryService.GetMonthlyTotalsAsync(year, ct);
        return ServiceResultMapper.ToActionResult(this, result);
    }

    [HttpGet("categories")]
    [ProducesResponseType<IReadOnlyList<CategorySummaryRow>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest, "application/problem+json")]
    public async Task<IActionResult> Categories([FromQuery] string? month, CancellationToken ct)
    {
        ServiceResult<IReadOnlyList<CategorySummaryRow>> result = await _summaryService.GetCategorySummaryAsync(month, ct);
        return ServiceResultMapper.ToActionResult(this, result);
    }
}
