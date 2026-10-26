using ExpenseManagement.Api.Contracts;
using ExpenseManagement.Api.Data;
using ExpenseManagement.Api.Services.Validation;
using Microsoft.EntityFrameworkCore;

namespace ExpenseManagement.Api.Services;

/// <summary>Loads the rows for one month and hands them to <see cref="CategorySummaryCalculator"/>. Shared by summaries and reports.</summary>
public static class MonthSummaryLoader
{
    public static async Task<IReadOnlyList<CategorySummaryRow>> LoadCategoryRowsAsync(AppDbContext db, MonthKey month, CancellationToken ct)
    {
        DateOnly first = month.FirstDay;
        DateOnly last = month.LastDay;
        int year = month.Year;
        int monthNumber = month.Month;

        List<CategoryInfo> categories = await db.Categories
            .AsNoTracking()
            .Select(category => new CategoryInfo(category.Id, category.Name))
            .ToListAsync(ct);
        List<CategoryBudgetInfo> budgets = await db.Budgets
            .AsNoTracking()
            .Where(budget => budget.Year == year && budget.Month == monthNumber)
            .Select(budget => new CategoryBudgetInfo(budget.CategoryId, budget.LimitAmount))
            .ToListAsync(ct);
        List<CategoryAmount> amounts = await db.Expenses
            .AsNoTracking()
            .Where(expense => expense.Date >= first && expense.Date <= last)
            .Select(expense => new CategoryAmount(expense.CategoryId, expense.Amount))
            .ToListAsync(ct);

        return CategorySummaryCalculator.Build(categories, budgets, amounts);
    }
}
