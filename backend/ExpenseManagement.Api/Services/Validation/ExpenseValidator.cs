using ExpenseManagement.Api.Contracts;

namespace ExpenseManagement.Api.Services.Validation;

/// <summary>VR-01…VR-04 for an expense body. Category existence needs the database and is checked in the service.</summary>
public static class ExpenseValidator
{
    public const decimal MaxAmount = 1_000_000m;
    public const int MaxTitleLength = 100;
    public const int MaxNotesLength = 500;

    public static ValidationErrors Validate(ExpenseRequest request, DateOnly today)
    {
        ValidationErrors errors = new ValidationErrors();

        string title = request.Title?.Trim() ?? string.Empty;
        if (title.Length == 0)
        {
            errors.Add("Title", "Title is required.");
        }
        else if (title.Length > MaxTitleLength)
        {
            errors.Add("Title", $"Title must be at most {MaxTitleLength} characters.");
        }

        if (request.Amount is not decimal amount)
        {
            errors.Add("Amount", "Amount is required.");
        }
        else if (amount <= 0m)
        {
            errors.Add("Amount", "Amount must be greater than 0.");
        }
        else if (amount > MaxAmount)
        {
            errors.Add("Amount", "Amount must be at most 1,000,000.");
        }
        else if (!MoneyRules.HasAtMostTwoDecimals(amount))
        {
            errors.Add("Amount", "Amount must have at most 2 decimal places.");
        }

        if (request.Date is not DateOnly date)
        {
            errors.Add("Date", "Date is required.");
        }
        else if (date > today)
        {
            errors.Add("Date", "Date cannot be in the future.");
        }

        if (request.CategoryId is null)
        {
            errors.Add("CategoryId", "CategoryId is required.");
        }

        if (request.Notes is not null && request.Notes.Trim().Length > MaxNotesLength)
        {
            errors.Add("Notes", $"Notes must be at most {MaxNotesLength} characters.");
        }

        return errors;
    }
}
