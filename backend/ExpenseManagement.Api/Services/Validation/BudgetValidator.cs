using ExpenseManagement.Api.Contracts;
using ExpenseManagement.Api.Domain;

namespace ExpenseManagement.Api.Services.Validation;

/// <summary>VR-06, VR-07 and VR-09 for a budget body.</summary>
public static class BudgetValidator
{
    public static ValidationErrors Validate(BudgetRequest request, out MonthKey month, out BudgetEnforcement enforcement)
    {
        ValidationErrors errors = new ValidationErrors();

        if (request.CategoryId is null)
        {
            errors.Add("CategoryId", "CategoryId is required.");
        }

        if (!MonthKey.TryParse(request.Month, out month))
        {
            errors.Add("Month", "Month must be YYYY-MM with a year from 2000 to 2100 and a month from 01 to 12.");
        }

        if (request.Limit is not decimal limit)
        {
            errors.Add("Limit", "Limit is required.");
        }
        else if (limit <= 0m)
        {
            errors.Add("Limit", "Limit must be greater than 0.");
        }
        else if (limit > MoneyRules.MaxStorable)
        {
            errors.Add("Limit", "Limit is too large.");
        }
        else if (!MoneyRules.HasAtMostTwoDecimals(limit))
        {
            errors.Add("Limit", "Limit must have at most 2 decimal places.");
        }

        if (!TryParseEnforcement(request.Type, out enforcement))
        {
            errors.Add("Type", "Type must be Hard or Soft.");
        }

        return errors;
    }

    /// <summary>Accepts "Hard" or "Soft" (any case). Numeric strings are rejected.</summary>
    public static bool TryParseEnforcement(string? value, out BudgetEnforcement enforcement)
    {
        string text = value?.Trim() ?? string.Empty;
        if (string.Equals(text, nameof(BudgetEnforcement.Hard), StringComparison.OrdinalIgnoreCase))
        {
            enforcement = BudgetEnforcement.Hard;
            return true;
        }

        if (string.Equals(text, nameof(BudgetEnforcement.Soft), StringComparison.OrdinalIgnoreCase))
        {
            enforcement = BudgetEnforcement.Soft;
            return true;
        }

        enforcement = default;
        return false;
    }
}
