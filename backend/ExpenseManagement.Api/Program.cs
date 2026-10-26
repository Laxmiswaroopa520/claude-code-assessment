using System.Diagnostics;
using System.Text.Json.Serialization;
using ExpenseManagement.Api.Data;
using ExpenseManagement.Api.Infrastructure;
using ExpenseManagement.Api.Services;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Scalar.AspNetCore;

const string FrontendCorsPolicy = "FrontendDevOrigin";
const string FrontendOrigin = "http://localhost:5173";

WebApplicationBuilder builder = WebApplication.CreateBuilder(args);

builder.Services
    .AddControllers()
    .AddJsonOptions(options => options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));

// Every error body is RFC 7807 ProblemDetails with instance and traceId.
builder.Services.AddProblemDetails(options =>
{
    options.CustomizeProblemDetails = context =>
    {
        context.ProblemDetails.Instance ??= context.HttpContext.Request.Path;
        context.ProblemDetails.Extensions.TryAdd("traceId", Activity.Current?.Id ?? context.HttpContext.TraceIdentifier);
    };
});

builder.Services.AddOpenApi();

// SQLite file path from configuration. A relative path is resolved against the content root
// (backend/ExpenseManagement.Api) so `dotnet run` and `dotnet ef` always use the same file.
string configuredConnection = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("Connection string 'DefaultConnection' is missing.");
SqliteConnectionStringBuilder connectionBuilder = new SqliteConnectionStringBuilder(configuredConnection);
if (connectionBuilder.DataSource != ":memory:" && !Path.IsPathRooted(connectionBuilder.DataSource))
{
    connectionBuilder.DataSource = Path.Combine(builder.Environment.ContentRootPath, connectionBuilder.DataSource);
}

string connectionString = connectionBuilder.ToString();
builder.Services.AddDbContext<AppDbContext>(options => options.UseSqlite(connectionString));

builder.Services.AddSingleton<TimeProvider>(TimeProvider.System);
builder.Services.AddScoped<ICategoryService, CategoryService>();
builder.Services.AddScoped<IExpenseService, ExpenseService>();
builder.Services.AddScoped<IBudgetService, BudgetService>();
builder.Services.AddScoped<ISummaryService, SummaryService>();
builder.Services.AddScoped<IReportService, ReportService>();

builder.Services.AddCors(options =>
{
    options.AddPolicy(FrontendCorsPolicy, policy => policy
        .WithOrigins(FrontendOrigin)
        .AllowAnyHeader()
        .AllowAnyMethod()
        .WithExposedHeaders("Content-Disposition", "Location"));
});

WebApplication app = builder.Build();

// Unhandled exceptions: log server-side, return a generic 500 ProblemDetails with no exception details.
app.UseExceptionHandler(exceptionApp => exceptionApp.Run(WriteUnhandledExceptionAsync));
app.UseStatusCodePages();

if (app.Environment.IsDevelopment() || app.Environment.IsEnvironment("Testing"))
{
    app.MapOpenApi();
}

if (app.Environment.IsDevelopment())
{
    app.MapScalarApiReference();

    // Never migrates; only seeds an already-migrated, empty database.
    await DevDataSeeder.SeedAsync(app.Services, CancellationToken.None);
}

app.UseCors(FrontendCorsPolicy);
app.MapControllers();

app.Run();

static async Task WriteUnhandledExceptionAsync(HttpContext context)
{
    IExceptionHandlerFeature? feature = context.Features.Get<IExceptionHandlerFeature>();
    ILogger logger = context.RequestServices.GetRequiredService<ILoggerFactory>().CreateLogger("UnhandledException");
    if (feature is not null)
    {
        logger.LogError(feature.Error, "Unhandled exception while processing {Path}.", feature.Path);
    }

    context.Response.StatusCode = StatusCodes.Status500InternalServerError;
    IProblemDetailsService problemDetailsService = context.RequestServices.GetRequiredService<IProblemDetailsService>();
    ProblemDetails problem = new ProblemDetails
    {
        Status = StatusCodes.Status500InternalServerError,
        Title = "An unexpected error occurred.",
        Type = "https://tools.ietf.org/html/rfc9110#section-15.6.1",
        Detail = "The server could not complete the request. Quote the traceId when reporting this problem.",
    };
    await problemDetailsService.WriteAsync(new ProblemDetailsContext { HttpContext = context, ProblemDetails = problem });
}

public partial class Program;
