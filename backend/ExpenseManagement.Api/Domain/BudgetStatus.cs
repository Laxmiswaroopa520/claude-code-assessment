namespace ExpenseManagement.Api.Domain;

/// <summary>Budget usage: below 80 % OnTrack, 80–100 % Warning, above 100 % Exceeded (BR-01).</summary>
public enum BudgetStatus
{
    OnTrack,
    Warning,
    Exceeded,
}
