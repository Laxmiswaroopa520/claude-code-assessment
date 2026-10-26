using ExpenseManagement.Api.Data;
using ExpenseManagement.Api.Services.Validation;
using Microsoft.EntityFrameworkCore;

namespace ExpenseManagement.Api.Services;

/// <summary>Shared spending lookups. Rows are filtered in SQL and summed in C# (SQLite cannot SUM decimal).</summary>
public static class SpendingQueries
{
    /// <summary>Total spent in a category-month, optionally excluding one expense (used on update, BR-04).</summary>
    public static async Task<decimal> GetSpentAsync(
        AppDbContext db,
        int categoryId,
        MonthKey month,
        int? excludeExpenseId,
        CancellationToken ct)
    {
        DateOnly first = month.FirstDay;
        DateOnly last = month.LastDay;
        List<decimal> amounts = await db.Expenses
            .AsNoTracking()
            .Where(expense => expense.CategoryId == categoryId
                && expense.Date >= first
                && expense.Date <= last
                && (excludeExpenseId == null || expense.Id != excludeExpenseId))
            .Select(expense => expense.Amount)
            .ToListAsync(ct);
        return amounts.Sum();
    }
}
