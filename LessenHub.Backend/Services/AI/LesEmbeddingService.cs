using Google.GenAI;
using LessenHub.Application.Abstractions.External;
using LessenHub.Application.Helpers;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace LessenHub.Backend.Services.AI
{
    public class LesEmbeddingService(
        IConfiguration configuration,
        ILogger<LesEmbeddingService> logger) : ILesEmbeddingService
    {
        private readonly IConfiguration _configuration = configuration;
        private readonly ILogger<LesEmbeddingService> _logger = logger;

        public async Task<float[]> MaakEmbeddingAsync(string tekst, CancellationToken cancellationToken = default)
        {
            var normalized = tekst.Trim();
            if (normalized.Length == 0)
                return [];

            var truncated = normalized.Length > 8000 ? normalized[..8000] : normalized;

            var providerOrder = _configuration.GetSection("AI:EmbeddingProviderOrder").Get<string[]>();
            if (providerOrder == null || providerOrder.Length == 0)
            {
                var preferred = _configuration["AI:EmbeddingProvider"] ?? "Gemini";
                providerOrder = [preferred, "OpenAI"];
            }

            var fouten = new List<Exception>();
            foreach (var raw in providerOrder)
            {
                var provider = (raw ?? string.Empty).Trim();
                if (provider.Length == 0)
                    continue;

                try
                {
                    return provider.ToLowerInvariant() switch
                    {
                        "openai" => await EmbedViaOpenAiAsync(truncated, cancellationToken),
                        "gemini" => await EmbedViaGeminiAsync(truncated, cancellationToken),
                        _ => throw new InvalidOperationException($"Onbekende embedding provider: {provider}")
                    };
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Embedding via {Provider} mislukt", provider);
                    fouten.Add(ex);
                }
            }

            throw new AggregateException("Geen embedding provider beschikbaar.", fouten);
        }

        private async Task<float[]> EmbedViaOpenAiAsync(string tekst, CancellationToken cancellationToken)
        {
            var apiKey = _configuration["AI:OpenAI:ApiKey"];
            if (string.IsNullOrWhiteSpace(apiKey))
                throw new InvalidOperationException("OpenAI API key niet geconfigureerd voor embeddings.");

            var model = _configuration["AI:OpenAI:EmbeddingModel"] ?? "text-embedding-3-small";

            using var client = new HttpClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);

            var body = new { model, input = tekst };
            using var content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json");
            using var response = await client.PostAsync("https://api.openai.com/v1/embeddings", content, cancellationToken);
            response.EnsureSuccessStatusCode();

            using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync(cancellationToken));
            var values = doc.RootElement
                .GetProperty("data")[0]
                .GetProperty("embedding");

            return values.EnumerateArray().Select(e => e.GetSingle()).ToArray();
        }

        private async Task<float[]> EmbedViaGeminiAsync(string tekst, CancellationToken cancellationToken)
        {
            var model = _configuration["AI:Gemini:EmbeddingModel"] ?? "gemini-embedding-001";

            try
            {
                var client = new Client();
                var response = await client.Models.EmbedContentAsync(
                    model: model,
                    contents: tekst,
                    config: null,
                    cancellationToken: cancellationToken);

                var embedding = response?.Embeddings?.FirstOrDefault();
                if (embedding?.Values is { Count: > 0 } values)
                    return values.Select(v => (float)v).ToArray();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Gemini SDK embedding mislukt voor {Model}, probeer REST", model);
            }

            return await EmbedViaGeminiRestAsync(tekst, model, cancellationToken);
        }

        private async Task<float[]> EmbedViaGeminiRestAsync(string tekst, string model, CancellationToken cancellationToken)
        {
            var apiKey = Environment.GetEnvironmentVariable("GOOGLE_API_KEY")
                ?? _configuration["AI:Gemini:ApiKey"]
                ?? _configuration["AI:ApiKey"];

            if (string.IsNullOrWhiteSpace(apiKey))
                throw new InvalidOperationException("Gemini API key niet geconfigureerd voor embeddings.");

            using var client = new HttpClient();
            client.DefaultRequestHeaders.Add("x-goog-api-key", apiKey);

            var url = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:embedContent";
            var body = new
            {
                model = $"models/{model}",
                content = new { parts = new[] { new { text = tekst } } }
            };

            using var content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json");
            using var response = await client.PostAsync(url, content, cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                var errBody = await response.Content.ReadAsStringAsync(cancellationToken);
                throw new HttpRequestException(
                    $"Gemini embedContent ({(int)response.StatusCode}): {LesDuplicaatTekstHelper.Inkorten(errBody, 300)}");
            }

            using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync(cancellationToken));
            var values = doc.RootElement.GetProperty("embedding").GetProperty("values");

            return values.EnumerateArray().Select(e => e.GetSingle()).ToArray();
        }
    }
}
