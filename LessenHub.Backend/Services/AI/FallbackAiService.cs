namespace LessenHub.Backend.Services.AI
{
    public sealed record AiProviderCandidate(string Name, IAiService Service);

    public class FallbackAiService(
        IEnumerable<AiProviderCandidate> providers,
        ILogger<FallbackAiService> logger,
        AiAnalyseTraceHolder traceHolder) : IAiService
    {
        private readonly List<AiProviderCandidate> _providers = providers.ToList();
        private readonly ILogger<FallbackAiService> _logger = logger;

        public async Task<LesAnalyseResultaat> AnalyseerLesDocument(string documentTekst)
        {
            if (_providers.Count == 0)
            {
                throw new InvalidOperationException("Geen AI providers geconfigureerd voor fallback.");
            }

            traceHolder.Reset();
            var fouten = new List<Exception>();

            foreach (var provider in _providers)
            {
                try
                {
                    _logger.LogInformation("Probeer AI provider {ProviderName} voor documentanalyse", provider.Name);
                    traceHolder.LastCallAttempted = true;
                    var resultaat = await provider.Service.AnalyseerLesDocument(documentTekst);
                    _logger.LogInformation("AI provider {ProviderName} succesvol", provider.Name);
                    if (!traceHolder.LastCallSucceeded && traceHolder.LastRawResponse != null)
                    {
                        traceHolder.LastCallSucceeded = true;
                    }

                    return resultaat;
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "AI provider {ProviderName} gefaald, probeer volgende provider", provider.Name);
                    fouten.Add(ex);
                }
            }

            traceHolder.RecordAttempt(null, false);
            throw new AggregateException("Alle geconfigureerde AI providers zijn gefaald.", fouten);
        }
    }
}
