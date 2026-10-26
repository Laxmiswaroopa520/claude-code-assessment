using System.Net;
using System.Text;
using System.Text.Json;
using ExpenseManagement.Api.Contracts;
using ExpenseManagement.Api.Services;
using ExpenseManagement.Api.Tests.TestSupport;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace ExpenseManagement.Api.Tests.Integration;

public sealed class ErrorHandlingApiTests : ApiTestBase
{
    [Fact]
    [Trait("Requirement", "Errors §4")]
    public async Task NotFound_ProblemDetails_HasTypeTitleStatusInstanceAndTraceId()
    {
        // Act
        HttpResponseMessage response = await Client.GetAsync("/api/expenses/424242");

        // Assert
        JsonElement problem = await ReadProblemAsync(response);
        Assert.True(problem.TryGetProperty("type", out _));
        Assert.Equal(404, problem.GetProperty("status").GetInt32());
        Assert.Equal("/api/expenses/424242", problem.GetProperty("instance").GetString());
    }

    [Fact]
    [Trait("Requirement", "Errors §4")]
    public async Task MalformedJson_Returns400ProblemDetails()
    {
        // Arrange
        using StringContent content = new StringContent("{ \"title\": ", Encoding.UTF8, "application/json");

        // Act
        HttpResponseMessage response = await Client.PostAsync("/api/expenses", content);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        await ReadProblemAsync(response);
    }

    [Fact]
    [Trait("Requirement", "Errors §4")]
    public async Task UnhandledException_Returns500WithoutExceptionDetails()
    {
        // Arrange
        using WebApplicationFactory<Program> throwingFactory = Factory.WithWebHostBuilder(builder =>
            builder.ConfigureServices(services =>
            {
                services.RemoveAll<ICategoryService>();
                services.AddScoped<ICategoryService, ThrowingCategoryService>();
            }));
        using HttpClient client = throwingFactory.CreateClient();

        // Act
        HttpResponseMessage response = await client.GetAsync("/api/categories");

        // Assert
        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        string body = await response.Content.ReadAsStringAsync();
        Assert.DoesNotContain(ThrowingCategoryService.SecretMessage, body, StringComparison.Ordinal);
        Assert.DoesNotContain("InvalidOperationException", body, StringComparison.Ordinal);
        using JsonDocument document = JsonDocument.Parse(body);
        Assert.True(document.RootElement.TryGetProperty("traceId", out _));
    }

    [Fact]
    [Trait("Requirement", "FR-18 AC1")]
    public async Task OpenApiDocument_Returns200()
    {
        // Act
        HttpResponseMessage response = await Client.GetAsync("/openapi/v1.json");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        string body = await response.Content.ReadAsStringAsync();
        Assert.Contains("/api/expenses", body, StringComparison.Ordinal);
    }

    private sealed class ThrowingCategoryService : ICategoryService
    {
        public const string SecretMessage = "secret connection detail that must not leak";

        public Task<ServiceResult<IReadOnlyList<CategoryResponse>>> ListAsync(CancellationToken ct) =>
            throw new InvalidOperationException(SecretMessage);

        public Task<ServiceResult<CategoryResponse>> GetAsync(int id, CancellationToken ct) =>
            throw new InvalidOperationException(SecretMessage);

        public Task<ServiceResult<CategoryResponse>> CreateAsync(CategoryRequest request, CancellationToken ct) =>
            throw new InvalidOperationException(SecretMessage);

        public Task<ServiceResult<CategoryResponse>> UpdateAsync(int id, CategoryRequest request, CancellationToken ct) =>
            throw new InvalidOperationException(SecretMessage);

        public Task<ServiceResult<bool>> DeleteAsync(int id, CancellationToken ct) =>
            throw new InvalidOperationException(SecretMessage);
    }
}
