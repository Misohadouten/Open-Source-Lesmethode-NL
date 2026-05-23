namespace LessenHub.Backend.Services;

/// <summary>
/// Optionele debug-metadata voor de auto-fill pipeline (alleen diagnostiek).
/// </summary>
public class LesAnalysePipelineDebug
{
    public int DocumentTextLength { get; set; }
    public string? DocumentTextPreview { get; set; }
    public bool AiCallAttempted { get; set; }
    public bool AiCallSucceeded { get; set; }
    public string? AiRawResponsePreview { get; set; }
    public string? ValidationResult { get; set; }
}

public class LesAnalyseDocumentResponse
{
    public required AI.LesAnalyseResultaat Result { get; set; }
    public LesAnalysePipelineDebug? Debug { get; set; }
}
