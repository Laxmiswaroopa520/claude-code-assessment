using ExpenseManagement.Api.Services.Validation;

namespace ExpenseManagement.Api.Tests.Unit;

public sealed class MonthKeyTests
{
    [Theory]
    [Trait("Requirement", "BR-08")]
    [InlineData("2026-10", 2026, 10, "2026-10-01", "2026-10-31")]
    [InlineData("2028-02", 2028, 2, "2028-02-01", "2028-02-29")]
    [InlineData("2026-02", 2026, 2, "2026-02-01", "2026-02-28")]
    public void TryParse_ValidMonth_ReturnsCalendarBoundaries(string text, int year, int month, string first, string last)
    {
        // Arrange / Act
        bool parsed = MonthKey.TryParse(text, out MonthKey key);

        // Assert
        Assert.True(parsed);
        Assert.Equal(year, key.Year);
        Assert.Equal(month, key.Month);
        Assert.Equal(DateOnly.Parse(first, System.Globalization.CultureInfo.InvariantCulture), key.FirstDay);
        Assert.Equal(DateOnly.Parse(last, System.Globalization.CultureInfo.InvariantCulture), key.LastDay);
        Assert.Equal(text, key.ToString());
    }

    [Theory]
    [Trait("Requirement", "VR-07")]
    [InlineData("2026-13")]
    [InlineData("26-10")]
    [InlineData("2026/10")]
    [InlineData("")]
    public void TryParse_InvalidMonth_ReturnsFalse(string text)
    {
        // Arrange / Act
        bool parsed = MonthKey.TryParse(text, out MonthKey _);

        // Assert
        Assert.False(parsed);
    }
}
