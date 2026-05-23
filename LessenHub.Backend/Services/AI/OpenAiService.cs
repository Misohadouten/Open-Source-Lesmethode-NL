using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace LessenHub.Backend.Services.AI
{
    public class OpenAiService : IAiService
    {
        private readonly HttpClient _httpClient;
        private readonly string _model;
        private readonly ILogger<OpenAiService> _logger;
        private readonly AiAnalyseTraceHolder? _trace;

        public OpenAiService(IConfiguration configuration, ILogger<OpenAiService> logger, AiAnalyseTraceHolder? trace = null)
        {
            _logger = logger;
            _trace = trace;
            var apiKey = (!string.IsNullOrWhiteSpace(configuration["AI:OpenAI:ApiKey"]))
                ? configuration["AI:OpenAI:ApiKey"]
                : configuration["AI:ApiKey"];

            if (string.IsNullOrWhiteSpace(apiKey))
                throw new InvalidOperationException("AI:OpenAI:ApiKey (of AI:ApiKey) is niet geconfigureerd.");

            _model = configuration["AI:OpenAI:Model"] ?? configuration["AI:Model"] ?? "gpt-4o-mini";
            _httpClient = new HttpClient();
            _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
        }

        public async Task<LesAnalyseResultaat> AnalyseerLesDocument(string documentTekst)
        {
            var prompt = LesAnalyseExtractionPrompt.Bouw(documentTekst);
            _logger.LogInformation(
                "AI prompt/input lengte: {Length} tekens (eerste 500): {Preview}",
                prompt.Length,
                prompt.Length > 500 ? prompt[..500] : prompt);

            var requestBody = new
            {
                model = _model,
                messages = new object[]
                {
                    new { role = "system", content = "Je vult een lesformulier vanuit een document. Herken titel, introductie, inhoud en slot semantisch (ook zonder vaste labels). Antwoord alleen met geldig JSON; ontbrekende velden als \"\" of []." },
                    new { role = "user", content = prompt }
                },
                temperature = 0.1,
                response_format = new { type = "json_object" }
            };

            var json = JsonSerializer.Serialize(requestBody);
            using var content = new StringContent(json, Encoding.UTF8, "application/json");
            using var response = await _httpClient.PostAsync("https://api.openai.com/v1/chat/completions", content);
            response.EnsureSuccessStatusCode();

            var responseJson = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(responseJson);

            var messageContent = doc.RootElement
                .GetProperty("choices")[0]
                .GetProperty("message")
                .GetProperty("content")
                .GetString() ?? "{}";

            _logger.LogInformation("AI raw response: {Response}", messageContent);
            _trace?.RecordAttempt(messageContent, true);

            return LesAnalyseJsonParser.Parse(messageContent, _logger);
        }
    }
}
