using System.Globalization;
using ExpenseManagement.Api.Domain;
using ExpenseManagement.Api.Services.Validation;

namespace ExpenseManagement.Api.Services;

/// <summary>Outcome of checking one expense against a budget.</summary>
public sealed record BudgetDecision(bool Rejected, string? Warning, decimal ProjectedSpent, BudgetStatus StatusAfter);

/// <summary>Pure budget rules (BR-01…BR-03). No database or clock access, so it is unit-tested directly.</summary>
public static class BudgetCalculator
{
    public const decimal WarningThresholdPercent = 80m;

    /// <summary>Unrounded percentage of the limit that is used.</summary>
    public static decimal PercentUsed(decimal spent, decimal limit) => limit <= 0m ? 0m : spent / limit * 100m;

    /// <summary>Below 80 % OnTrack, 80–100 % Warning, above 100 % Exceeded.</summary>
    public static BudgetStatus GetStatus(decimal spent, decimal limit)
    {
        decimal percent = PercentUsed(spent, limit);
        if (percent < WarningThresholdPercent)
        {
            return BudgetStatus.OnTrack;
        }

        return percent <= 100m ? BudgetStatus.Warning : BudgetStatus.Exceeded;
    }

    /// <summary>
    /// Checks adding <paramref name="amount"/> to a category-month that already has <paramref name="spentBefore"/>
    /// (the expense being updated is already excluded). Hard: rejected when the total goes above the limit.
    /// Soft: always allowed, with a warning when the total becomes Exceeded or moves from OnTrack into Warning.
    /// </summary>
    public static BudgetDecision Evaluate(
        decimal limit,
        BudgetEnforcement enforcement,
        decimal spentBefore,
        decimal amount,
        string categoryName,
        MonthKey month)
    {
        decimal projected = spentBefore + amount;
        BudgetStatus before = GetStatus(spentBefore, limit);
        BudgetStatus after = GetStatus(projected, limit);

        if (enforcement == BudgetEnforcement.Hard)
        {
            return new BudgetDecision(projected > limit, null, projected, after);
        }

        string? warning = null;
        if (after == BudgetStatus.Exceeded)
        {
            warning = $"Budget exceeded for '{categoryName}' in {month}: {Format(projected)} / {Format(limit)}";
        }
        else if (after == BudgetStatus.Warning && before == BudgetStatus.OnTrack)
        {
            decimal percent = MoneyRules.RoundForOutput(PercentUsed(projected, limit));
            warning = $"Budget warning for '{categoryName}' in {month}: {Format(projected)} / {Format(limit)} ({Format(percent)}% used)";
        }

        return new BudgetDecision(false, warning, projected, after);
    }

    public static string Format(decimal value) => value.ToString("N2", CultureInfo.InvariantCulture);
}
