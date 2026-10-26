using System.Globalization;
using ExpenseManagement.Api.Domain;
using ExpenseManagement.Api.Services;
using ExpenseManagement.Api.Services.Validation;

namespace ExpenseManagement.Api.Tests.Unit;

public sealed class BudgetCalculatorTests
{
    private static readonly MonthKey October = new MonthKey(2026, 10);

    [Theory]
    [Trait("Requirement", "BR-01")]
    [InlineData("79.99", BudgetStatus.OnTrack)]
    [InlineData("80", BudgetStatus.Warning)]
    [InlineData("100", BudgetStatus.Warning)]
    [InlineData("100.01", BudgetStatus.Exceeded)]
    [InlineData("0", BudgetStatus.OnTrack)]
    public void GetStatus_SpentAgainstLimit100_ReturnsThresholdStatus(string spent, BudgetStatus expected)
    {
        // Arrange
        decimal spentAmount = decimal.Parse(spent, CultureInfo.InvariantCulture);

        // Act
        BudgetStatus status = BudgetCalculator.GetStatus(spentAmount, 100m);

        // Assert
        Assert.Equal(expected, status);
    }

    [Fact]
    [Trait("Requirement", "FR-11 AC1")]
    public void Evaluate_HardBudgetExactlyAtLimit_IsAllowed()
    {
        // Arrange / Act
        BudgetDecision decision = BudgetCalculator.Evaluate(100m, BudgetEnforcement.Hard, 90m, 10m, "Food", October);

        // Assert
        Assert.False(decision.Rejected);
        Assert.Equal(BudgetStatus.Warning, decision.StatusAfter);
        Assert.Null(decision.Warning);
    }

    [Fact]
    [Trait("Requirement", "FR-11 AC2")]
    public void Evaluate_HardBudgetOverByOneCent_IsRejected()
    {
        // Arrange / Act
        BudgetDecision decision = BudgetCalculator.Evaluate(100m, BudgetEnforcement.Hard, 90m, 10.01m, "Food", October);

        // Assert
        Assert.True(decision.Rejected);
        Assert.Equal(100.01m, decision.ProjectedSpent);
    }

    [Fact]
    [Trait("Requirement", "FR-12 AC1")]
    public void Evaluate_SoftBudgetExceeded_AllowsWithExceededWarning()
    {
        // Arrange / Act
        BudgetDecision decision = BudgetCalculator.Evaluate(100m, BudgetEnforcement.Soft, 90m, 20m, "Food", October);

        // Assert
        Assert.False(decision.Rejected);
        Assert.Equal(BudgetStatus.Exceeded, decision.StatusAfter);
        Assert.Equal("Budget exceeded for 'Food' in 2026-10: 110.00 / 100.00", decision.Warning);
    }

    [Fact]
    [Trait("Requirement", "BR-03")]
    public void Evaluate_SoftBudgetMovesIntoWarning_ReturnsWarning()
    {
        // Arrange / Act
        BudgetDecision decision = BudgetCalculator.Evaluate(1000m, BudgetEnforcement.Soft, 700m, 150m, "Food", October);

        // Assert
        Assert.Equal(BudgetStatus.Warning, decision.StatusAfter);
        Assert.NotNull(decision.Warning);
        Assert.Contains("85.00% used", decision.Warning, StringComparison.Ordinal);
    }

    [Fact]
    [Trait("Requirement", "BR-03")]
    public void Evaluate_SoftBudgetAlreadyInWarningStaysInWarning_ReturnsNoWarning()
    {
        // Arrange / Act
        BudgetDecision decision = BudgetCalculator.Evaluate(1000m, BudgetEnforcement.Soft, 850m, 50m, "Food", October);

        // Assert
        Assert.Equal(BudgetStatus.Warning, decision.StatusAfter);
        Assert.Null(decision.Warning);
    }

    [Fact]
    [Trait("Requirement", "BR-01")]
    public void PercentUsed_ZeroLimit_ReturnsZero()
    {
        // Arrange / Act
        decimal percent = BudgetCalculator.PercentUsed(50m, 0m);

        // Assert
        Assert.Equal(0m, percent);
    }
}
