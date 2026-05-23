using Google.GenAI;
using System.Text.Json;

namespace LessenHub.Backend.Services.AI
{
    public class GeminiService : IAiService
    {
        private readonly string _apiKey;
        private readonly string _model;
        private readonly ILogger<GeminiService> _logger;
        private readonly AiAnalyseTraceHolder? _trace;

        public GeminiService(IConfiguration configuration, ILogger<GeminiService> logger, AiAnalyseTraceHolder? trace = null)
        {
            _logger = logger;
            _trace = trace;
            var apiKey = (!string.IsNullOrWhiteSpace(configuration["AI:Gemini:ApiKey"])) 
                ? configuration["AI:Gemini:ApiKey"] 
                : configuration["AI:ApiKey"];
            if (string.IsNullOrWhiteSpace(apiKey))
                throw new InvalidOperationException("AI:Gemini:ApiKey (of AI:ApiKey) is niet geconfigureerd.");
            
            _logger.LogInformation("GeminiService constructor - API key found, length: {KeyLen}", apiKey.Length);
            
            _apiKey = apiKey;
            _model = configuration["AI:Gemini:Model"] ?? configuration["AI:Model"] ?? "gemini-1.5-flash";
            
            _logger.LogInformation("GeminiService initialized with model: {Model}", _model);
        }

        public async Task<LesAnalyseResultaat> AnalyseerLesDocument(string documentTekst)
        {
            try
            {
                _logger.LogInformation("GeminiService.AnalyseerLesDocument - API key length: {KeyLen}, Model: {Model}, Env GOOGLE_API_KEY set: {HasEnvKey}", 
                    _apiKey?.Length ?? 0, _model, !string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("GOOGLE_API_KEY")));
                
                // Don't pass apiKey - let Client read from GOOGLE_API_KEY environment variable
                var client = new Client();
                var prompt = LesAnalyseExtractionPrompt.Bouw(documentTekst);
                _logger.LogInformation(
                    "AI prompt/input lengte: {Length} tekens (eerste 500): {Preview}",
                    prompt.Length,
                    prompt.Length > 500 ? prompt[..500] : prompt);

                var response = await client.Models.GenerateContentAsync(
                    model: _model,
                    contents: prompt
                );

                var tekst = response.Candidates?[0].Content?.Parts?[0].Text ?? "{}";

                _logger.LogInformation("AI raw response: {Response}", tekst);
                _trace?.RecordAttempt(tekst, true);

                var result = ParseResultaat(tekst, _logger);
                _logger.LogInformation("Gemini parsed result - Titel: {Titel}, Inhoud chars: {InhoudLen}, Literatuur items: {LitCount}",
                    result.Titel ?? "(leeg)",
                    result.Inhoud?.Length ?? 0,
                    result.Literatuurlijst?.Count ?? 0);
                return result;
            }
            catch (ArgumentException ex) when (ex.Message.Contains("API key"))
            {
                _logger.LogError(ex, "Gemini API key error - check GOOGLE_API_KEY environment variable");
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Gemini general error");
                throw;
            }
        }

        private static LesAnalyseResultaat ParseResultaat(string json, ILogger logger) =>
            LesAnalyseJsonParser.Parse(json, logger);
    }
}