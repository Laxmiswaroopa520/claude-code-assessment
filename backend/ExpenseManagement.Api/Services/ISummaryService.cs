using ExpenseManagement.Api.Contracts;

namespace ExpenseManagement.Api.Services;

/// <summary>Summaries: FR-13 and FR-14.</summary>
public interface ISummaryService
{
    /// <summary>Totals and counts per month of a year, for months that have expenses, ascending.</summary>
    /// <param name="year">Calendar year 2000–2100 (required).</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>Ok or ValidationFailed (missing or out-of-range year).</returns>
    Task<ServiceResult<IReadOnlyList<MonthlyTotalResponse>>> GetMonthlyTotalsAsync(int? year, CancellationToken ct);

    /// <summary>One row per category for a month: total, count, share of the month, and budget usage when a budget exists.</summary>
    /// <param name="month">"YYYY-MM" (required).</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>Ok (zero rows for an empty month) or ValidationFailed (bad month).</returns>
    Task<ServiceResult<IReadOnlyList<CategorySummaryRow>>> GetCategorySummaryAsync(string? month, CancellationToken ct);
}
