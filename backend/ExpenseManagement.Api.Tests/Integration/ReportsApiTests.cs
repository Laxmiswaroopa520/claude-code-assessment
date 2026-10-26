using System.Net;
using ExpenseManagement.Api.Contracts;
using ExpenseManagement.Api.Tests.TestSupport;

namespace ExpenseManagement.Api.Tests.Integration;

public sealed class ReportsApiTests : ApiTestBase
{
    [Fact]
    [Trait("Requirement", "FR-15 AC1")]
    public async Task MonthlyReport_Json_ReturnsTotalsCategoriesAndExpenses()
    {
        // Arrange
        CategoryResponse food = await CreateCategoryAsync("Food");
        await CreateExpenseAsync(food.Id, 12.50m, new DateOnly(2026, 10, 2), "Lunch");
        await CreateExpenseAsync(food.Id, 7.25m, new DateOnly(2026, 10, 1), "Coffee");
        await CreateExpenseAsync(food.Id, 100m, new DateOnly(2026, 9, 30), "Not in October");

        // Act
        HttpResponseMessage response = await Client.GetAsync("/api/reports/monthly?month=2026-10&format=json");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("application/json", response.Content.Headers.ContentType?.MediaType);
        MonthlyReport report = await ReadAsync<MonthlyReport>(response);
        Assert.Equal("2026-10", report.Month);
        Assert.Equal(new DateOnly(2026, 10, 1), report.From);
        Assert.Equal(new DateOnly(2026, 10, 31), report.To);
        Assert.Equal(19.75m, report.GrandTotal);
        Assert.Equal(2, report.ExpenseCount);
        Assert.Equal(new[] { "Coffee", "Lunch" }, report.Expenses.Select(expense => expense.Title));
        CategorySummaryRow foodRow = Assert.Single(report.Categories);
        Assert.Equal(19.75m, foodRow.Total);
    }

    [Fact]
    [Trait("Requirement", "FR-15 AC1")]
    public async Task MonthlyReport_DefaultFormat_IsJson()
    {
        // Act
        HttpResponseMessage response = await Client.GetAsync("/api/reports/monthly?month=2026-10");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        MonthlyReport report = await ReadAsync<MonthlyReport>(response);
        Assert.Equal(0m, report.GrandTotal);
        Assert.Empty(report.Expenses);
    }

    [Fact]
    [Trait("Requirement", "FR-16 AC1")]
    public async Task MonthlyReport_Csv_ReturnsAttachmentWithFileName()
    {
        // Arrange
        CategoryResponse food = await CreateCategoryAsync("Food");
        await CreateExpenseAsync(food.Id, 12.50m, new DateOnly(2026, 10, 2), "Lunch");

        // Act
        HttpResponseMessage response = await Client.GetAsync("/api/reports/monthly?month=2026-10&format=csv");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("text/csv", response.Content.Headers.ContentType?.MediaType);
        Assert.Equal("attachment", response.Content.Headers.ContentDisposition?.DispositionType);
        string? fileName = response.Content.Headers.ContentDisposition?.FileName?.Trim('"');
        Assert.Equal("expenses-2026-10.csv", fileName);
    }

    [Fact]
    [Trait("Requirement", "FR-16 AC2")]
    public async Task MonthlyReport_Csv_HasHeaderEscapingAndInvariantAmounts()
    {
        // Arrange
        CategoryResponse food = await CreateCategoryAsync("Food, Drink");
        await CreateExpenseAsync(food.Id, 12.5m, new DateOnly(2026, 10, 2), "Lunch, \"team\"");
        await CreateExpenseAsync(food.Id, 1000m, new DateOnly(2026, 10, 3), "=SUM(A1)");

        // Act
        HttpResponseMessage response = await Client.GetAsync("/api/reports/monthly?month=2026-10&format=csv");
        string csv = await response.Content.ReadAsStringAsync();

        // Assert
        string[] lines = csv.Split("\r\n", StringSplitOptions.RemoveEmptyEntries);
        Assert.Equal("Date,Title,Category,Amount", lines[0]);
        Assert.Equal("2026-10-02,\"Lunch, \"\"team\"\"\",\"Food, Drink\",12.50", lines[1]);
        Assert.Equal("2026-10-03,'=SUM(A1),\"Food, Drink\",1000.00", lines[2]);
        Assert.Equal(3, lines.Length);
    }

    [Theory]
    [Trait("Requirement", "FR-16 AC3")]
    [InlineData("?month=2026-10&format=xml", "format")]
    [InlineData("?month=2026-13&format=csv", "month")]
    [InlineData("?format=json", "month")]
    public async Task MonthlyReport_InvalidMonthOrFormat_Returns400(string query, string field)
    {
        // Act
        HttpResponseMessage response = await Client.GetAsync($"/api/reports/monthly{query}");

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        AssertHasError(await ReadProblemAsync(response), field);
    }
}
