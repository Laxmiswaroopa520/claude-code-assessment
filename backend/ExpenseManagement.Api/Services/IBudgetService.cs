using ExpenseManagement.Api.Contracts;

namespace ExpenseManagement.Api.Services;

/// <summary>Budget rules: FR-10, VR-06…VR-09, BR-01.</summary>
public interface IBudgetService
{
    /// <summary>Lists budgets with their calculated usage, optionally for one month.</summary>
    /// <param name="month">Optional "YYYY-MM" filter.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>Ok or ValidationFailed (bad month).</returns>
    Task<ServiceResult<IReadOnlyList<BudgetResponse>>> ListAsync(string? month, CancellationToken ct);

    /// <summary>Gets one budget with its calculated usage.</summary>
    /// <param name="id">Budget id.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>Ok or NotFound.</returns>
    Task<ServiceResult<BudgetResponse>> GetAsync(int id, CancellationToken ct);

    /// <summary>Creates a budget; only one per category and month.</summary>
    /// <param name="request">Category, month, limit and type.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>Created, ValidationFailed or Conflict (duplicate category and month).</returns>
    Task<ServiceResult<BudgetResponse>> CreateAsync(BudgetRequest request, CancellationToken ct);

    /// <summary>Updates a budget's category, month, limit or type.</summary>
    /// <param name="id">Budget id.</param>
    /// <param name="request">New values.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>Ok, ValidationFailed, NotFound or Conflict.</returns>
    Task<ServiceResult<BudgetResponse>> UpdateAsync(int id, BudgetRequest request, CancellationToken ct);

    /// <summary>Deletes a budget.</summary>
    /// <param name="id">Budget id.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>NoContent or NotFound.</returns>
    Task<ServiceResult<bool>> DeleteAsync(int id, CancellationToken ct);
}
