using ExpenseManagement.Api.Contracts;
using ExpenseManagement.Api.Data;
using ExpenseManagement.Api.Services.Validation;
using Microsoft.EntityFrameworkCore;

namespace ExpenseManagement.Api.Services;

public sealed class SummaryService : ISummaryService
{
    private readonly AppDbContext _db;

    public SummaryService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<ServiceResult<IReadOnlyList<MonthlyTotalResponse>>> GetMonthlyTotalsAsync(int? year, CancellationToken ct)
    {
        if (year is not int validYear || !MonthKey.IsValidYear(validYear))
        {
            return ServiceResult<IReadOnlyList<MonthlyTotalResponse>>.ValidationFailed(
                "year", "year is required and must be from 2000 to 2100.");
        }

        DateOnly first = new DateOnly(validYear, 1, 1);
        DateOnly last = new DateOnly(validYear, 12, 31);
        List<DatedAmount> rows = await _db.Expenses
            .AsNoTracking()
            .Where(expense => expense.Date >= first && expense.Date <= last)
            .Select(expense => new DatedAmount(expense.Date, expense.Amount))
            .ToListAsync(ct);

        List<MonthlyTotalResponse> totals = rows
            .GroupBy(row => row.Date.Month)
            .OrderBy(group => group.Key)
            .Select(group => new MonthlyTotalResponse(
                new MonthKey(validYear, group.Key).ToString(),
                group.Sum(row => row.Amount),
                group.Count()))
            .ToList();
        return ServiceResult<IReadOnlyList<MonthlyTotalResponse>>.Ok(totals);
    }

    public async Task<ServiceResult<IReadOnlyList<CategorySummaryRow>>> GetCategorySummaryAsync(string? month, CancellationToken ct)
    {
        if (!MonthKey.TryParse(month, out MonthKey monthKey))
        {
            return ServiceResult<IReadOnlyList<CategorySummaryRow>>.ValidationFailed(
                "month", "month is required as YYYY-MM with a year from 2000 to 2100 and a month from 01 to 12.");
        }

        IReadOnlyList<CategorySummaryRow> rows = await MonthSummaryLoader.LoadCategoryRowsAsync(_db, monthKey, ct);
        return ServiceResult<IReadOnlyList<CategorySummaryRow>>.Ok(rows);
    }

    private sealed record DatedAmount(DateOnly Date, decimal Amount);
}
