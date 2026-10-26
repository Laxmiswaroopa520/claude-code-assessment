using System.Globalization;
using ExpenseManagement.Api.Contracts;
using ExpenseManagement.Api.Services.Validation;

namespace ExpenseManagement.Api.Tests.Unit;

public sealed class ExpenseValidatorTests
{
    private static readonly DateOnly Today = new DateOnly(2026, 10, 15);

    private static ExpenseRequest Valid() => new ExpenseRequest("Lunch", 12.50m, Today, 1, null);

    [Fact]
    [Trait("Requirement", "FR-05 AC1")]
    public void Validate_ValidRequest_HasNoErrors()
    {
        // Arrange
        ExpenseRequest request = Valid();

        // Act
        ValidationErrors errors = ExpenseValidator.Validate(request, Today);

        // Assert
        Assert.False(errors.HasErrors);
    }

    [Theory]
    [Trait("Requirement", "FR-05 AC2")]
    [InlineData("0")]
    [InlineData("-1")]
    [InlineData("1000000.01")]
    [InlineData("10.123")]
    public void Validate_InvalidAmount_HasAmountError(string amount)
    {
        // Arrange
        ExpenseRequest request = Valid() with { Amount = decimal.Parse(amount, CultureInfo.InvariantCulture) };

        // Act
        ValidationErrors errors = ExpenseValidator.Validate(request, Today);

        // Assert
        Assert.True(errors.Contains("Amount"));
    }

    [Theory]
    [Trait("Requirement", "VR-01")]
    [InlineData("0.01")]
    [InlineData("1000000")]
    [InlineData("12.5")]
    public void Validate_BoundaryAmount_IsAccepted(string amount)
    {
        // Arrange
        ExpenseRequest request = Valid() with { Amount = decimal.Parse(amount, CultureInfo.InvariantCulture) };

        // Act
        ValidationErrors errors = ExpenseValidator.Validate(request, Today);

        // Assert
        Assert.False(errors.Contains("Amount"));
    }

    [Fact]
    [Trait("Requirement", "FR-05 AC2")]
    public void Validate_MissingAmount_HasAmountError()
    {
        // Arrange
        ExpenseRequest request = Valid() with { Amount = null };

        // Act
        ValidationErrors errors = ExpenseValidator.Validate(request, Today);

        // Assert
        Assert.True(errors.Contains("Amount"));
    }

    [Fact]
    [Trait("Requirement", "VR-02")]
    public void Validate_DateToday_IsAccepted()
    {
        // Arrange
        ExpenseRequest request = Valid() with { Date = Today };

        // Act
        ValidationErrors errors = ExpenseValidator.Validate(request, Today);

        // Assert
        Assert.False(errors.Contains("Date"));
    }

    [Fact]
    [Trait("Requirement", "FR-05 AC2")]
    public void Validate_DateTomorrow_HasDateError()
    {
        // Arrange
        ExpenseRequest request = Valid() with { Date = Today.AddDays(1) };

        // Act
        ValidationErrors errors = ExpenseValidator.Validate(request, Today);

        // Assert
        Assert.True(errors.Contains("Date"));
    }

    [Fact]
    [Trait("Requirement", "FR-05 AC2")]
    public void Validate_MissingDate_HasDateError()
    {
        // Arrange
        ExpenseRequest request = Valid() with { Date = null };

        // Act
        ValidationErrors errors = ExpenseValidator.Validate(request, Today);

        // Assert
        Assert.True(errors.Contains("Date"));
    }

    [Theory]
    [Trait("Requirement", "FR-05 AC2")]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(null)]
    public void Validate_EmptyTitle_HasTitleError(string? title)
    {
        // Arrange
        ExpenseRequest request = Valid() with { Title = title };

        // Act
        ValidationErrors errors = ExpenseValidator.Validate(request, Today);

        // Assert
        Assert.True(errors.Contains("Title"));
    }

    [Theory]
    [Trait("Requirement", "VR-03")]
    [InlineData(100, false)]
    [InlineData(101, true)]
    public void Validate_TitleLength_EnforcesMaximum(int length, bool expectError)
    {
        // Arrange
        ExpenseRequest request = Valid() with { Title = new string('a', length) };

        // Act
        ValidationErrors errors = ExpenseValidator.Validate(request, Today);

        // Assert
        Assert.Equal(expectError, errors.Contains("Title"));
    }

    [Fact]
    [Trait("Requirement", "VR-04")]
    public void Validate_MissingCategory_HasCategoryError()
    {
        // Arrange
        ExpenseRequest request = Valid() with { CategoryId = null };

        // Act
        ValidationErrors errors = ExpenseValidator.Validate(request, Today);

        // Assert
        Assert.True(errors.Contains("CategoryId"));
    }

    [Theory]
    [Trait("Requirement", "VR-01")]
    [InlineData(500, false)]
    [InlineData(501, true)]
    public void Validate_NotesLength_EnforcesMaximum(int length, bool expectError)
    {
        // Arrange
        ExpenseRequest request = Valid() with { Notes = new string('n', length) };

        // Act
        ValidationErrors errors = ExpenseValidator.Validate(request, Today);

        // Assert
        Assert.Equal(expectError, errors.Contains("Notes"));
    }
}
