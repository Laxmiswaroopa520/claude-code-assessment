namespace ExpenseManagement.Api.Services.Validation;

/// <summary>Collects field-level validation messages, keyed by field name.</summary>
public sealed class ValidationErrors
{
    private readonly Dictionary<string, List<string>> _errors = new Dictionary<string, List<string>>();

    public bool HasErrors => _errors.Count > 0;

    public void Add(string field, string message)
    {
        if (!_errors.TryGetValue(field, out List<string>? messages))
        {
            messages = new List<string>();
            _errors[field] = messages;
        }

        messages.Add(message);
    }

    public bool Contains(string field) => _errors.ContainsKey(field);

    public IReadOnlyDictionary<string, string[]> ToDictionary()
    {
        Dictionary<string, string[]> result = new Dictionary<string, string[]>();
        foreach (KeyValuePair<string, List<string>> pair in _errors)
        {
            result[pair.Key] = pair.Value.ToArray();
        }

        return result;
    }
}
