using ExpenseManagement.Api.Contracts;
using ExpenseManagement.Api.Domain;
using ExpenseManagement.Api.Services.Validation;

namespace ExpenseManagement.Api.Services;

public sealed record CategoryInfo(int Id, string Name);

public sealed record CategoryBudgetInfo(int CategoryId, decimal LimitAmount);

public sealed record CategoryAmount(int CategoryId, decimal Amount);

/// <summary>Pure per-category summary for one month (FR-14). Aggregation is done here in C# because SQLite cannot SUM decimals.</summary>
public static class CategorySummaryCalculator
{
    /// <summary>One row per category (zero totals included), sorted by total descending, then name.</summary>
    public static IReadOnlyList<CategorySummaryRow> Build(
        IReadOnlyList<CategoryInfo> categories,
        IReadOnlyList<CategoryBudgetInfo> budgets,
        IReadOnlyList<CategoryAmount> amounts)
    {
        decimal grandTotal = amounts.Sum(item => item.Amount);
        List<CategorySummaryRow> rows = new List<CategorySummaryRow>();

        foreach (CategoryInfo category in categories)
        {
            List<decimal> categoryAmounts = amounts.Where(item => item.CategoryId == category.Id).Select(item => item.Amount).ToList();
            decimal total = categoryAmounts.Sum();
            decimal percentOfTotal = grandTotal == 0m ? 0m : MoneyRules.RoundForOutput(total / grandTotal * 100m);

            CategoryBudgetInfo? budget = budgets.FirstOrDefault(item => item.CategoryId == category.Id);
            decimal? limit = budget?.LimitAmount;
            decimal? percentUsed = null;
            BudgetStatus? status = null;
            if (budget is not null)
            {
                percentUsed = MoneyRules.RoundForOutput(BudgetCalculator.PercentUsed(total, budget.LimitAmount));
                status = BudgetCalculator.GetStatus(total, budget.LimitAmount);
            }

            rows.Add(new CategorySummaryRow(category.Id, category.Name, total, categoryAmounts.Count, percentOfTotal, limit, percentUsed, status));
        }

        return rows
            .OrderByDescending(row => row.Total)
            .ThenBy(row => row.CategoryName, StringComparer.OrdinalIgnoreCase)
            .ToList();
    }
}
