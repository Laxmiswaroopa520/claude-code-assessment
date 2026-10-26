using ExpenseManagement.Api.Contracts;
using ExpenseManagement.Api.Domain;
using ExpenseManagement.Api.Services;

namespace ExpenseManagement.Api.Tests.Unit;

public sealed class CategorySummaryCalculatorTests
{
    private static readonly IReadOnlyList<CategoryInfo> Categories = new List<CategoryInfo>
    {
        new CategoryInfo(1, "Food"),
        new CategoryInfo(2, "Travel"),
        new CategoryInfo(3, "Health"),
    };

    [Fact]
    [Trait("Requirement", "FR-14 AC1")]
    public void Build_MultipleCategories_TotalsCountsPercentagesAndBudgetStatus()
    {
        // Arrange
        List<CategoryAmount> amounts = new List<CategoryAmount>
        {
            new CategoryAmount(1, 50.00m),
            new CategoryAmount(1, 40.00m),
            new CategoryAmount(2, 30.00m),
        };
        List<CategoryBudgetInfo> budgets = new List<CategoryBudgetInfo> { new CategoryBudgetInfo(1, 100m) };

        // Act
        IReadOnlyList<CategorySummaryRow> rows = CategorySummaryCalculator.Build(Categories, budgets, amounts);

        // Assert
        Assert.Equal(3, rows.Count);
        CategorySummaryRow food = rows[0];
        Assert.Equal("Food", food.CategoryName);
        Assert.Equal(90.00m, food.Total);
        Assert.Equal(2, food.Count);
        Assert.Equal(75.00m, food.PercentOfTotal);
        Assert.Equal(100m, food.BudgetLimit);
        Assert.Equal(90.00m, food.PercentUsed);
        Assert.Equal(BudgetStatus.Warning, food.Status);

        CategorySummaryRow health = rows[2];
        Assert.Equal(0m, health.Total);
        Assert.Equal(0, health.Count);
        Assert.Null(health.BudgetLimit);
        Assert.Null(health.Status);
    }

    [Fact]
    [Trait("Requirement", "FR-14 AC1")]
    public void Build_EmptyMonth_ReturnsZeroRows()
    {
        // Arrange / Act
        IReadOnlyList<CategorySummaryRow> rows = CategorySummaryCalculator.Build(
            Categories, new List<CategoryBudgetInfo>(), new List<CategoryAmount>());

        // Assert
        Assert.All(rows, row => Assert.Equal(0m, row.Total));
        Assert.All(rows, row => Assert.Equal(0m, row.PercentOfTotal));
    }

    [Fact]
    [Trait("Requirement", "BR-07")]
    public void Build_PercentOfTotal_RoundsToTwoDecimals()
    {
        // Arrange
        List<CategoryAmount> amounts = new List<CategoryAmount>
        {
            new CategoryAmount(1, 1.00m),
            new CategoryAmount(2, 1.00m),
            new CategoryAmount(3, 1.00m),
        };

        // Act
        IReadOnlyList<CategorySummaryRow> rows = CategorySummaryCalculator.Build(Categories, new List<CategoryBudgetInfo>(), amounts);

        // Assert
        Assert.All(rows, row => Assert.Equal(33.33m, row.PercentOfTotal));
    }
}
