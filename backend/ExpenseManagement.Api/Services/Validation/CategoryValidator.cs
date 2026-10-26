using ExpenseManagement.Api.Contracts;

namespace ExpenseManagement.Api.Services.Validation;

/// <summary>VR-05 (name) and the description length. Uniqueness needs the database and is checked in the service.</summary>
public static class CategoryValidator
{
    public const int MaxNameLength = 50;
    public const int MaxDescriptionLength = 250;

    public static ValidationErrors Validate(CategoryRequest request)
    {
        ValidationErrors errors = new ValidationErrors();
        string name = request.Name?.Trim() ?? string.Empty;
        if (name.Length == 0)
        {
            errors.Add("Name", "Name is required.");
        }
        else if (name.Length > MaxNameLength)
        {
            errors.Add("Name", $"Name must be at most {MaxNameLength} characters.");
        }

        if (request.Description is not null && request.Description.Trim().Length > MaxDescriptionLength)
        {
            errors.Add("Description", $"Description must be at most {MaxDescriptionLength} characters.");
        }

        return errors;
    }
}
