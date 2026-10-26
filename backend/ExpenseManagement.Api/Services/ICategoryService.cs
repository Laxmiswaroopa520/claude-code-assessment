using ExpenseManagement.Api.Contracts;

namespace ExpenseManagement.Api.Services;

/// <summary>Category rules: FR-01…FR-04, VR-05, BR-06.</summary>
public interface ICategoryService
{
    /// <summary>Lists all categories sorted by name.</summary>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>Ok.</returns>
    Task<ServiceResult<IReadOnlyList<CategoryResponse>>> ListAsync(CancellationToken ct);

    /// <summary>Gets one category.</summary>
    /// <param name="id">Category id.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>Ok or NotFound.</returns>
    Task<ServiceResult<CategoryResponse>> GetAsync(int id, CancellationToken ct);

    /// <summary>Creates a category with a unique (case-insensitive) name.</summary>
    /// <param name="request">Name and optional description.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>Created, ValidationFailed or Conflict (duplicate name).</returns>
    Task<ServiceResult<CategoryResponse>> CreateAsync(CategoryRequest request, CancellationToken ct);

    /// <summary>Renames or re-describes a category.</summary>
    /// <param name="id">Category id.</param>
    /// <param name="request">New name and description.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>Ok, ValidationFailed, NotFound or Conflict (duplicate name).</returns>
    Task<ServiceResult<CategoryResponse>> UpdateAsync(int id, CategoryRequest request, CancellationToken ct);

    /// <summary>Deletes a category that has no expenses, together with its budgets.</summary>
    /// <param name="id">Category id.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>NoContent, NotFound or Conflict (category has expenses).</returns>
    Task<ServiceResult<bool>> DeleteAsync(int id, CancellationToken ct);
}
