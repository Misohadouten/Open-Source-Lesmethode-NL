using System.Text;
using System.Text.Json;

namespace LessenHub.Backend.Services.AI
{
    public class AnthropicService : IAiService
    {
        private readonly HttpClient _httpClient;
        private readonly string _model;
        private readonly ILogger<AnthropicService> _logger;

        public AnthropicService(IConfiguration configuration, ILogger<AnthropicService> logger)
        {
            _logger = logger;
            var apiKey = (!string.IsNullOrWhiteSpace(configuration["AI:Anthropic:ApiKey"])) 
                ? configuration["AI:Anthropic:ApiKey"] 
                : configuration["AI:ApiKey"];
            if (string.IsNullOrWhiteSpace(apiKey))
                throw new InvalidOperationException("AI:Anthropic:ApiKey (of AI:ApiKey) is niet geconfigureerd.");

            _model = configuration["AI:Anthropic:Model"] ?? configuration["AI:Model"] ?? "claude-sonnet-4-5";
            _httpClient = new HttpClient();
            _httpClient.DefaultRequestHeaders.Add("x-api-key", apiKey);
            _httpClient.DefaultRequestHeaders.Add("anthropic-version", "2023-06-01");
        }

        public async Task<LesAnalyseResultaat> AnalyseerLesDocument(string documentTekst)
        {
            var prompt = LesAnalyseExtractionPrompt.Bouw(documentTekst);

            var requestBody = new
            {
                model = _model,
                max_tokens = 1000,
                system = "Je vult een lesformulier vanuit een document. Kopieer alle secties en bulletpunten volledig naar JSON; geen samenvatting, geen verzonnen tekst. Alleen geldig JSON.",
                messages = new[]
                {
                    new { role = "user", content = prompt }
                },
            };

            var json = JsonSerializer.Serialize(requestBody);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await _httpClient.PostAsync("https://api.anthropic.com/v1/messages", content);
            response.EnsureSuccessStatusCode();

            var responseJson = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(responseJson);

            var messageContent = doc.RootElement
                .GetProperty("content")[0]
                .GetProperty("text")
                .GetString() ?? "{}";

            _logger.LogInformation("Anthropic response (eerste 500 chars): {Response}", 
                messageContent.Length > 500 ? messageContent[..500] : messageContent);

            var result = ParseResultaat(messageContent, _logger);
            _logger.LogInformation("Anthropic parsed result - Titel: {Titel}, Inhoud chars: {InhoudLen}, Literatuur items: {LitCount}",
                result.Titel ?? "(leeg)",
                result.Inhoud?.Length ?? 0,
                result.Literatuurlijst?.Count ?? 0);
            return result;
        }

        private static LesAnalyseResultaat ParseResultaat(string json, ILogger logger) =>
            LesAnalyseJsonParser.Parse(json, logger);
    }
}