namespace ExpenseManagement.Api.Services;

/// <summary>Monthly report: FR-15 (JSON) and FR-16 (CSV).</summary>
public interface IReportService
{
    /// <summary>Builds the monthly report in the requested format.</summary>
    /// <param name="month">"YYYY-MM" (required).</param>
    /// <param name="format">"json" (default) or "csv".</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>Ok (JSON report or CSV file) or ValidationFailed (bad month or format).</returns>
    Task<ServiceResult<ReportOutput>> GetMonthlyReportAsync(string? month, string? format, CancellationToken ct);
}
