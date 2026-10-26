namespace ExpenseManagement.Api.Tests.TestSupport;

/// <summary>Hand-written fixed clock so "today" is deterministic in tests (no extra package).</summary>
public sealed class FixedTimeProvider : TimeProvider
{
    private readonly DateTimeOffset _utcNow;

    public FixedTimeProvider(DateTimeOffset utcNow)
    {
        _utcNow = utcNow;
    }

    public override DateTimeOffset GetUtcNow() => _utcNow;
}
