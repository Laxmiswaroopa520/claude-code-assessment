using ExpenseManagement.Api.Contracts;

namespace ExpenseManagement.Api.Services;

/// <summary>Expense rules: FR-05…FR-12, VR-01…VR-04, VR-10…VR-12, BR-02…BR-05.</summary>
public interface IExpenseService
{
    /// <summary>Searches, filters, sorts and pages expenses.</summary>
    /// <param name="query">Optional filters, sort and paging.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>Ok or ValidationFailed (bad paging, range or sort values).</returns>
    Task<ServiceResult<PagedResponse<ExpenseResponse>>> ListAsync(ExpenseQuery query, CancellationToken ct);

    /// <summary>Gets one expense.</summary>
    /// <param name="id">Expense id.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>Ok or NotFound.</returns>
    Task<ServiceResult<ExpenseResponse>> GetAsync(int id, CancellationToken ct);

    /// <summary>Creates an expense after validation and budget enforcement.</summary>
    /// <param name="request">The expense to create.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>Created (with soft-budget warnings), ValidationFailed, or BudgetRejected (hard budget exceeded).</returns>
    Task<ServiceResult<ExpenseResponse>> CreateAsync(ExpenseRequest request, CancellationToken ct);

    /// <summary>Updates an expense; the budget check excludes its old amount and uses the target category and month.</summary>
    /// <param name="id">Expense id.</param>
    /// <param name="request">The new values.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>Ok (with soft-budget warnings), ValidationFailed, NotFound or BudgetRejected.</returns>
    Task<ServiceResult<ExpenseResponse>> UpdateAsync(int id, ExpenseRequest request, CancellationToken ct);

    /// <summary>Deletes an expense.</summary>
    /// <param name="id">Expense id.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>NoContent or NotFound.</returns>
    Task<ServiceResult<bool>> DeleteAsync(int id, CancellationToken ct);
}
