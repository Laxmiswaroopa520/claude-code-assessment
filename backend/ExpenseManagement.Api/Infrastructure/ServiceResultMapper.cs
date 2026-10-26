using ExpenseManagement.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace ExpenseManagement.Api.Infrastructure;

/// <summary>The only place that turns a <see cref="ServiceResult{T}"/> into an HTTP response (architecture D3).</summary>
public static class ServiceResultMapper
{
    private const string ProblemJson = "application/problem+json";

    public static IActionResult ToActionResult<T>(
        ControllerBase controller,
        ServiceResult<T> result,
        string? createdAtActionName = null,
        Func<T, object>? createdRouteValues = null)
    {
        switch (result.Status)
        {
            case ServiceStatus.Ok:
                return controller.Ok(result.Value);
            case ServiceStatus.Created:
                if (createdAtActionName is not null && createdRouteValues is not null && result.Value is T created)
                {
                    return controller.CreatedAtAction(createdAtActionName, createdRouteValues(created), created);
                }

                return controller.StatusCode(StatusCodes.Status201Created, result.Value);
            case ServiceStatus.NoContent:
                return controller.NoContent();
            case ServiceStatus.ValidationFailed:
                return ValidationProblem(controller, result.Errors);
            case ServiceStatus.NotFound:
                return Problem(controller, StatusCodes.Status404NotFound, "Not Found", result.Detail, null);
            case ServiceStatus.Conflict:
                return Problem(controller, StatusCodes.Status409Conflict, "Conflict", result.Detail, null);
            case ServiceStatus.BudgetRejected:
                return Problem(controller, StatusCodes.Status422UnprocessableEntity, "Budget exceeded", result.Detail, result.Extensions);
            default:
                throw new InvalidOperationException($"Unhandled service status '{result.Status}'.");
        }
    }

    private static ObjectResult ValidationProblem(ControllerBase controller, IReadOnlyDictionary<string, string[]>? errors)
    {
        ModelStateDictionary modelState = new ModelStateDictionary();
        if (errors is not null)
        {
            foreach (KeyValuePair<string, string[]> pair in errors)
            {
                foreach (string message in pair.Value)
                {
                    modelState.AddModelError(pair.Key, message);
                }
            }
        }

        ValidationProblemDetails details = controller.ProblemDetailsFactory.CreateValidationProblemDetails(
            controller.HttpContext,
            modelState,
            StatusCodes.Status400BadRequest,
            instance: controller.HttpContext.Request.Path);
        return AsProblemResult(details);
    }

    private static ObjectResult Problem(
        ControllerBase controller,
        int statusCode,
        string title,
        string? detail,
        IReadOnlyDictionary<string, object?>? extensions)
    {
        ProblemDetails details = controller.ProblemDetailsFactory.CreateProblemDetails(
            controller.HttpContext,
            statusCode,
            title,
            detail: detail,
            instance: controller.HttpContext.Request.Path);
        if (extensions is not null)
        {
            foreach (KeyValuePair<string, object?> pair in extensions)
            {
                details.Extensions[pair.Key] = pair.Value;
            }
        }

        return AsProblemResult(details);
    }

    private static ObjectResult AsProblemResult(ProblemDetails details)
    {
        ObjectResult result = new ObjectResult(details) { StatusCode = details.Status };
        result.ContentTypes.Add(ProblemJson);
        return result;
    }
}
