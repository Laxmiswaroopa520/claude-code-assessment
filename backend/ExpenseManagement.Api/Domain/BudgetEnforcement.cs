namespace ExpenseManagement.Api.Domain;

/// <summary>How a budget reacts to overspending.</summary>
public enum BudgetEnforcement
{
    /// <summary>Spending above the limit is rejected (HTTP 422).</summary>
    Hard,

    /// <summary>Spending above the limit is saved and a warning is returned.</summary>
    Soft,
}
