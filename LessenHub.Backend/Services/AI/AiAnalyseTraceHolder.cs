namespace LessenHub.Backend.Services.AI;

/// <summary>Bewaart het laatste ruwe AI-antwoord voor pipeline-debugging.</summary>
public sealed class AiAnalyseTraceHolder
{
    public string? LastRawResponse { get; set; }
    public bool LastCallAttempted { get; set; }
    public bool LastCallSucceeded { get; set; }

    public void Reset()
    {
        LastRawResponse = null;
        LastCallAttempted = false;
        LastCallSucceeded = false;
    }

    public void RecordAttempt(string? rawResponse, bool succeeded)
    {
        LastCallAttempted = true;
        LastCallSucceeded = succeeded;
        LastRawResponse = rawResponse;
    }
}
