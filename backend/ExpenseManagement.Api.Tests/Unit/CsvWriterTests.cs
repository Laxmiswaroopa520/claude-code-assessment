using ExpenseManagement.Api.Infrastructure;

namespace ExpenseManagement.Api.Tests.Unit;

public sealed class CsvWriterTests
{
    [Theory]
    [Trait("Requirement", "FR-16 AC2")]
    [InlineData("Lunch", "Lunch")]
    [InlineData("Lunch, dinner", "\"Lunch, dinner\"")]
    [InlineData("The \"best\" taxi", "\"The \"\"best\"\" taxi\"")]
    [InlineData("Line1\nLine2", "\"Line1\nLine2\"")]
    [InlineData("", "")]
    [InlineData(null, "")]
    public void EscapeField_Rfc4180Cases_EscapesCorrectly(string? input, string expected)
    {
        // Arrange / Act
        string escaped = CsvWriter.EscapeField(input);

        // Assert
        Assert.Equal(expected, escaped);
    }

    [Theory]
    [Trait("Requirement", "Security: CSV injection")]
    [InlineData("=SUM(A1:A9)", "'=SUM(A1:A9)")]
    [InlineData("+1+1", "'+1+1")]
    [InlineData("-2", "'-2")]
    [InlineData("@cmd", "'@cmd")]
    [InlineData("=HYPERLINK(\"x\")", "\"'=HYPERLINK(\"\"x\"\")\"")]
    public void EscapeField_FormulaPrefix_IsNeutralised(string input, string expected)
    {
        // Arrange / Act
        string escaped = CsvWriter.EscapeField(input);

        // Assert
        Assert.Equal(expected, escaped);
    }

    [Fact]
    [Trait("Requirement", "FR-16 AC2")]
    public void FormatRecord_JoinsEscapedFieldsWithCommas()
    {
        // Arrange
        string?[] fields = new string?[] { "2026-10-01", "Taxi, airport", "Travel", "38.00" };

        // Act
        string record = CsvWriter.FormatRecord(fields);

        // Assert
        Assert.Equal("2026-10-01,\"Taxi, airport\",Travel,38.00", record);
    }
}
