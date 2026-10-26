using ExpenseManagement.Api.Contracts;
using ExpenseManagement.Api.Domain;
using ExpenseManagement.Api.Services.Validation;

namespace ExpenseManagement.Api.Tests.Unit;

public sealed class BudgetValidatorTests
{
    private static BudgetRequest Valid() => new BudgetRequest(1, "2026-10", 500m, "Hard");

    [Fact]
    [Trait("Requirement", "FR-10 AC1")]
    public void Validate_ValidRequest_ParsesMonthAndType()
    {
        // Arrange
        BudgetRequest request = Valid() with { Type = "soft" };

        // Act
        ValidationErrors errors = BudgetValidator.Validate(request, out MonthKey month, out BudgetEnforcement enforcement);

        // Assert
        Assert.False(errors.HasErrors);
        Assert.Equal(new MonthKey(2026, 10), month);
        Assert.Equal(BudgetEnforcement.Soft, enforcement);
    }

    [Theory]
    [Trait("Requirement", "FR-10 AC3")]
    [InlineData("0")]
    [InlineData("-5")]
    [InlineData("10.555")]
    public void Validate_InvalidLimit_HasLimitError(string limit)
    {
        // Arrange
        BudgetRequest request = Valid() with { Limit = decimal.Parse(limit, System.Globalization.CultureInfo.InvariantCulture) };

        // Act
        ValidationErrors errors = BudgetValidator.Validate(request, out MonthKey _, out BudgetEnforcement _);

        // Assert
        Assert.True(errors.Contains("Limit"));
    }

    [Theory]
    [Trait("Requirement", "FR-10 AC3")]
    [InlineData("2026-13")]
    [InlineData("2026-00")]
    [InlineData("1999-12")]
    [InlineData("2101-01")]
    [InlineData("2026-1")]
    [InlineData("October")]
    [InlineData(null)]
    public void Validate_InvalidMonth_HasMonthError(string? month)
    {
        // Arrange
        BudgetRequest request = Valid() with { Month = month };

        // Act
        ValidationErrors errors = BudgetValidator.Validate(request, out MonthKey _, out BudgetEnforcement _);

        // Assert
        Assert.True(errors.Contains("Month"));
    }

    [Theory]
    [Trait("Requirement", "FR-10 AC3")]
    [InlineData("Weekly")]
    [InlineData("0")]
    [InlineData("")]
    [InlineData(null)]
    public void Validate_InvalidType_HasTypeError(string? type)
    {
        // Arrange
        BudgetRequest request = Valid() with { Type = type };

        // Act
        ValidationErrors errors = BudgetValidator.Validate(request, out MonthKey _, out BudgetEnforcement _);

        // Assert
        Assert.True(errors.Contains("Type"));
    }
}
