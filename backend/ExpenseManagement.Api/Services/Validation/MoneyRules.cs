namespace ExpenseManagement.Api.Services.Validation;

/// <summary>Shared money rules (BR-07): decimal only, at most 2 decimal places.</summary>
public static class MoneyRules
{
    /// <summary>Largest value that fits decimal(18,2).</summary>
    public const decimal MaxStorable = 9_999_999_999_999_999.99m;

    public static bool HasAtMostTwoDecimals(decimal value) => decimal.Round(value, 2) == value;

    /// <summary>Rounds a calculated value for output (percentages); stored amounts are already 2 dp.</summary>
    public static decimal RoundForOutput(decimal value) => decimal.Round(value, 2, MidpointRounding.AwayFromZero);
}
