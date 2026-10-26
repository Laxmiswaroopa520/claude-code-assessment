using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ExpenseManagement.Api.Contracts;
using ExpenseManagement.Api.Tests.TestSupport;

namespace ExpenseManagement.Api.Tests.Integration;

public sealed class ExpensesApiTests : ApiTestBase
{
    [Fact]
    [Trait("Requirement", "FR-05 AC1")]
    public async Task CreateExpense_ValidBody_Returns201WithEmptyWarningsAndLocation()
    {
        // Arrange
        CategoryResponse category = await CreateCategoryAsync("Food");
        ExpenseRequest request = new ExpenseRequest("  Lunch  ", 12.50m, Today, category.Id, "Team lunch");

        // Act
        HttpResponseMessage response = await PostExpenseAsync(request);

        // Assert
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        ExpenseResponse created = await ReadAsync<ExpenseResponse>(response);
        Assert.Equal("Lunch", created.Title);
        Assert.Equal(12.50m, created.Amount);
        Assert.Equal(Today, created.Date);
        Assert.Equal("Food", created.CategoryName);
        Assert.Empty(created.Warnings);
        Assert.NotNull(response.Headers.Location);
    }

    [Theory]
    [Trait("Requirement", "FR-05 AC2")]
    [InlineData("0")]
    [InlineData("-1")]
    [InlineData("1000000.01")]
    [InlineData("10.123")]
    public async Task CreateExpense_InvalidAmount_Returns400WithAmountError(string amount)
    {
        // Arrange
        CategoryResponse category = await CreateCategoryAsync("Food");

        // Act
        HttpResponseMessage response = await PostExpenseAsync(new ExpenseRequest("Lunch", Money(amount), Today, category.Id, null));

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        AssertHasError(await ReadProblemAsync(response), "Amount");
    }

    [Theory]
    [Trait("Requirement", "VR-01")]
    [InlineData("0.01")]
    [InlineData("1000000")]
    public async Task CreateExpense_BoundaryAmount_Returns201(string amount)
    {
        // Arrange
        CategoryResponse category = await CreateCategoryAsync("Food");

        // Act
        HttpResponseMessage response = await PostExpenseAsync(new ExpenseRequest("Boundary", Money(amount), Today, category.Id, null));

        // Assert
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Fact]
    [Trait("Requirement", "FR-05 AC2")]
    public async Task CreateExpense_FutureDate_Returns400WithDateError()
    {
        // Arrange
        CategoryResponse category = await CreateCategoryAsync("Food");

        // Act
        HttpResponseMessage response = await PostExpenseAsync(new ExpenseRequest("Lunch", 10m, Today.AddDays(1), category.Id, null));

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        AssertHasError(await ReadProblemAsync(response), "Date");
    }

    [Fact]
    [Trait("Requirement", "FR-05 AC2")]
    public async Task CreateExpense_MissingDate_Returns400WithDateError()
    {
        // Arrange
        CategoryResponse category = await CreateCategoryAsync("Food");

        // Act
        HttpResponseMessage response = await PostExpenseAsync(new ExpenseRequest("Lunch", 10m, null, category.Id, null));

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        AssertHasError(await ReadProblemAsync(response), "Date");
    }

    [Theory]
    [Trait("Requirement", "FR-05 AC2")]
    [InlineData(0)]
    [InlineData(101)]
    public async Task CreateExpense_InvalidTitleLength_Returns400WithTitleError(int length)
    {
        // Arrange
        CategoryResponse category = await CreateCategoryAsync("Food");

        // Act
        HttpResponseMessage response = await PostExpenseAsync(new ExpenseRequest(new string('t', length), 10m, Today, category.Id, null));

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        AssertHasError(await ReadProblemAsync(response), "Title");
    }

    [Fact]
    [Trait("Requirement", "FR-05 AC3")]
    public async Task CreateExpense_UnknownCategory_Returns400WithCategoryIdError()
    {
        // Act
        HttpResponseMessage response = await PostExpenseAsync(new ExpenseRequest("Lunch", 10m, Today, 9999, null));

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        AssertHasError(await ReadProblemAsync(response), "CategoryId");
    }

    [Fact]
    [Trait("Requirement", "VR-01")]
    public async Task CreateExpense_NotesTooLong_Returns400WithNotesError()
    {
        // Arrange
        CategoryResponse category = await CreateCategoryAsync("Food");

        // Act
        HttpResponseMessage response = await PostExpenseAsync(new ExpenseRequest("Lunch", 10m, Today, category.Id, new string('n', 501)));

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        AssertHasError(await ReadProblemAsync(response), "Notes");
    }

    [Fact]
    [Trait("Requirement", "FR-06 AC1")]
    public async Task GetExpense_ExistingAndUnknownIds_Return200And404()
    {
        // Arrange
        CategoryResponse category = await CreateCategoryAsync("Food");
        ExpenseResponse expense = await CreateExpenseAsync(category.Id, 20m);

        // Act
        HttpResponseMessage found = await Client.GetAsync($"/api/expenses/{expense.Id}");
        HttpResponseMessage missing = await Client.GetAsync("/api/expenses/9999");

        // Assert
        Assert.Equal(HttpStatusCode.OK, found.StatusCode);
        ExpenseResponse body = await ReadAsync<ExpenseResponse>(found);
        Assert.Equal(expense.Id, body.Id);
        Assert.Equal(HttpStatusCode.NotFound, missing.StatusCode);
        await ReadProblemAsync(missing);
    }

    [Fact]
    [Trait("Requirement", "FR-07 AC1")]
    public async Task UpdateExpense_ValidBody_Returns200WithUpdatedValues()
    {
        // Arrange
        CategoryResponse food = await CreateCategoryAsync("Food");
        CategoryResponse travel = await CreateCategoryAsync("Travel");
        ExpenseResponse expense = await CreateExpenseAsync(food.Id, 20m);
        ExpenseRequest update = new ExpenseRequest("Taxi", 35.75m, Today.AddDays(-3), travel.Id, "Airport");

        // Act
        HttpResponseMessage response = await Client.PutAsJsonAsync($"/api/expenses/{expense.Id}", update, Json);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        ExpenseResponse updated = await ReadAsync<ExpenseResponse>(response);
        Assert.Equal("Taxi", updated.Title);
        Assert.Equal(35.75m, updated.Amount);
        Assert.Equal("Travel", updated.CategoryName);
        Assert.Empty(updated.Warnings);
    }

    [Fact]
    [Trait("Requirement", "FR-07 AC2")]
    public async Task UpdateExpense_InvalidBody_Returns400()
    {
        // Arrange
        CategoryResponse category = await CreateCategoryAsync("Food");
        ExpenseResponse expense = await CreateExpenseAsync(category.Id, 20m);

        // Act
        HttpResponseMessage response = await Client.PutAsJsonAsync(
            $"/api/expenses/{expense.Id}", new ExpenseRequest("Lunch", 0m, Today, category.Id, null), Json);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        AssertHasError(await ReadProblemAsync(response), "Amount");
    }

    [Fact]
    [Trait("Requirement", "FR-07 AC2")]
    public async Task UpdateExpense_UnknownId_Returns404()
    {
        // Arrange
        CategoryResponse category = await CreateCategoryAsync("Food");

        // Act
        HttpResponseMessage response = await Client.PutAsJsonAsync(
            "/api/expenses/9999", new ExpenseRequest("Lunch", 10m, Today, category.Id, null), Json);

        // Assert
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    [Trait("Requirement", "FR-08 AC1")]
    public async Task DeleteExpense_ExistingThenRepeated_Returns204Then404()
    {
        // Arrange
        CategoryResponse category = await CreateCategoryAsync("Food");
        ExpenseResponse expense = await CreateExpenseAsync(category.Id, 20m);

        // Act
        HttpResponseMessage first = await Client.DeleteAsync($"/api/expenses/{expense.Id}");
        HttpResponseMessage second = await Client.DeleteAsync($"/api/expenses/{expense.Id}");

        // Assert
        Assert.Equal(HttpStatusCode.NoContent, first.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, second.StatusCode);
    }

    [Fact]
    [Trait("Requirement", "FR-17 AC1")]
    public async Task CreateExpense_IsPersistedAndVisibleToANewRequest()
    {
        // Arrange
        CategoryResponse category = await CreateCategoryAsync("Food");
        await CreateExpenseAsync(category.Id, 20m, title: "Persisted");

        // Act
        int count = await CountExpensesAsync();

        // Assert
        Assert.Equal(1, count);
    }
}
