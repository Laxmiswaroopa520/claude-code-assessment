using System.Globalization;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using ExpenseManagement.Api.Contracts;

namespace ExpenseManagement.Api.Tests.TestSupport;

/// <summary>
/// Base for integration tests. xUnit creates a new instance per test, so every test gets its own factory and its own
/// in-memory database: no shared data and no dependency on run order.
/// </summary>
public abstract class ApiTestBase : IDisposable
{
    protected static readonly JsonSerializerOptions Json = CreateJsonOptions();

    protected ApiTestBase()
    {
        Factory = new TestApiFactory();
        Client = Factory.CreateClient();
    }

    protected static DateOnly Today => DateOnly.FromDateTime(TestApiFactory.FixedUtcNow.UtcDateTime);

    protected static string CurrentMonth => Today.ToString("yyyy-MM", CultureInfo.InvariantCulture);

    protected TestApiFactory Factory { get; }

    protected HttpClient Client { get; }

    public void Dispose()
    {
        Client.Dispose();
        Factory.Dispose();
        GC.SuppressFinalize(this);
    }

    protected static decimal Money(string value) => decimal.Parse(value, NumberStyles.Number, CultureInfo.InvariantCulture);

    protected async Task<CategoryResponse> CreateCategoryAsync(string name, string? description = null)
    {
        HttpResponseMessage response = await Client.PostAsJsonAsync("/api/categories", new CategoryRequest(name, description), Json);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return await ReadAsync<CategoryResponse>(response);
    }

    protected Task<HttpResponseMessage> PostExpenseAsync(ExpenseRequest request) =>
        Client.PostAsJsonAsync("/api/expenses", request, Json);

    protected async Task<ExpenseResponse> CreateExpenseAsync(
        int categoryId,
        decimal amount,
        DateOnly? date = null,
        string title = "Test expense",
        string? notes = null)
    {
        HttpResponseMessage response = await PostExpenseAsync(new ExpenseRequest(title, amount, date ?? Today, categoryId, notes));
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return await ReadAsync<ExpenseResponse>(response);
    }

    protected async Task<BudgetResponse> CreateBudgetAsync(int categoryId, string month, decimal limit, string type)
    {
        HttpResponseMessage response = await Client.PostAsJsonAsync("/api/budgets", new BudgetRequest(categoryId, month, limit, type), Json);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return await ReadAsync<BudgetResponse>(response);
    }

    protected async Task<int> CountExpensesAsync()
    {
        HttpResponseMessage response = await Client.GetAsync("/api/expenses?pageSize=100");
        PagedResponse<ExpenseResponse> page = await ReadAsync<PagedResponse<ExpenseResponse>>(response);
        return page.TotalCount;
    }

    protected static async Task<T> ReadAsync<T>(HttpResponseMessage response)
    {
        T? value = await response.Content.ReadFromJsonAsync<T>(Json);
        return value ?? throw new InvalidOperationException($"Response body could not be read as {typeof(T).Name}.");
    }

    /// <summary>Asserts an RFC 7807 body (content type and required members) and returns it.</summary>
    protected static async Task<JsonElement> ReadProblemAsync(HttpResponseMessage response)
    {
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        string body = await response.Content.ReadAsStringAsync();
        using JsonDocument document = JsonDocument.Parse(body);
        JsonElement problem = document.RootElement.Clone();
        Assert.True(problem.TryGetProperty("title", out _), "ProblemDetails has no title.");
        Assert.True(problem.TryGetProperty("status", out _), "ProblemDetails has no status.");
        Assert.True(problem.TryGetProperty("traceId", out _), "ProblemDetails has no traceId.");
        Assert.DoesNotContain("   at ", body, StringComparison.Ordinal);
        return problem;
    }

    /// <summary>Asserts that a ValidationProblemDetails body has an error for <paramref name="field"/> (case-insensitive).</summary>
    protected static void AssertHasError(JsonElement problem, string field)
    {
        Assert.True(problem.TryGetProperty("errors", out JsonElement errors), "ProblemDetails has no errors.");
        bool found = errors.EnumerateObject().Any(property => string.Equals(property.Name, field, StringComparison.OrdinalIgnoreCase));
        Assert.True(found, $"Expected a validation error for '{field}', got: {errors}");
    }

    private static JsonSerializerOptions CreateJsonOptions()
    {
        JsonSerializerOptions options = new JsonSerializerOptions(JsonSerializerDefaults.Web);
        options.Converters.Add(new JsonStringEnumConverter());
        return options;
    }
}
