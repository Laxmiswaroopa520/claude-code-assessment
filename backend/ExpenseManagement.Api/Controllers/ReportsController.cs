using ExpenseManagement.Api.Contracts;
using ExpenseManagement.Api.Infrastructure;
using ExpenseManagement.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace ExpenseManagement.Api.Controllers;

[ApiController]
[Route("api/reports")]
public sealed class ReportsController : ControllerBase
{
    private readonly IReportService _reportService;

    public ReportsController(IReportService reportService)
    {
        _reportService = reportService;
    }

    /// <summary>Monthly report as JSON (default) or a CSV download (format=csv).</summary>
    [HttpGet("monthly")]
    [ProducesResponseType<MonthlyReport>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest, "application/problem+json")]
    public async Task<IActionResult> Monthly([FromQuery] string? month, [FromQuery] string? format, CancellationToken ct)
    {
        ServiceResult<ReportOutput> result = await _reportService.GetMonthlyReportAsync(month, format, ct);
        if (result.Status != ServiceStatus.Ok || result.Value is null)
        {
            return ServiceResultMapper.ToActionResult(this, result);
        }

        // Choosing the HTTP representation is the controller's job; all report rules live in the service.
        return result.Value.Csv is CsvFile csv
            ? File(csv.Content, "text/csv", csv.FileName)
            : Ok(result.Value.Json);
    }
}
