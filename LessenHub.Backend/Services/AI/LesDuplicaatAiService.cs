using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
namespace LessenHub.Backend.Services.AI
{
    public sealed record LesDuplicaatAiKandidaat(Guid Id, string Titel, string Samenvatting);

    public interface ILesDuplicaatAiService
    {
        Task<IReadOnlyList<(Guid KandidaatId, double Score, string Reden)>> VergelijkSemantischAsync(
            string nieuweLesTekst,
            IReadOnlyList<LesDuplicaatAiKandidaat> kandidaten,
            CancellationToken cancellationToken = default);
    }

    public class LesDuplicaatAiService(
        IConfiguration configuration,
        ILogger<LesDuplicaatAiService> logger) : ILesDuplicaatAiService
    {
        private readonly IConfiguration _configuration = configuration;
        private readonly ILogger<LesDuplicaatAiService> _logger = logger;

        public async Task<IReadOnlyList<(Guid KandidaatId, double Score, string Reden)>> VergelijkSemantischAsync(
            string nieuweLesTekst,
            IReadOnlyList<LesDuplicaatAiKandidaat> kandidaten,
            CancellationToken cancellationToken = default)
        {
            if (kandidaten.Count == 0)
                return [];

            var providerOrder = _configuration.GetSection("AI:ProviderOrder").Get<string[]>();
            if (providerOrder == null || providerOrder.Length == 0)
            {
                var preferred = _configuration["AI:Provider"] ?? "Gemini";
                providerOrder = [preferred, "OpenAI", "Anthropic", "Gemini"];
            }

            var fouten = new List<Exception>();
            foreach (var raw in providerOrder)
            {
                var provider = (raw ?? string.Empty).Trim();
                if (provider.Length == 0)
                    continue;

                try
                {
                    _logger.LogInformation("Duplicaatdetectie via AI provider {Provider}", provider);
                    return provider.ToLowerInvariant() switch
                    {
                        "openai" => await VergelijkViaOpenAiAsync(nieuweLesTekst, kandidaten, cancellationToken),
                        "anthropic" => await VergelijkViaAnthropicAsync(nieuweLesTekst, kandidaten, cancellationToken),
                        "gemini" => await VergelijkViaGeminiAsync(nieuweLesTekst, kandidaten, cancellationToken),
                        _ => throw new InvalidOperationException($"Onbekende AI provider: {provider}")
                    };
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Duplicaatdetectie via {Provider} mislukt", provider);
                    fouten.Add(ex);
                }
            }

            throw new AggregateException("Alle AI providers voor duplicaatdetectie zijn gefaald.", fouten);
        }

        private async Task<IReadOnlyList<(Guid KandidaatId, double Score, string Reden)>> VergelijkViaOpenAiAsync(
            string nieuweLesTekst,
            IReadOnlyList<LesDuplicaatAiKandidaat> kandidaten,
            CancellationToken cancellationToken)
        {
            var apiKey = _configuration["AI:OpenAI:ApiKey"] ?? _configuration["AI:ApiKey"]
                ?? throw new InvalidOperationException("AI API key niet geconfigureerd.");
            var model = _configuration["AI:OpenAI:Model"] ?? _configuration["AI:Model"] ?? "gpt-4o-mini";

            using var client = new HttpClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);

            var requestBody = new
            {
                model,
                messages = new object[]
                {
                    new { role = "system", content = "Je bent een onderwijs-expert die semantische duplicaten in lesmateriaal detecteert. Antwoord alleen in geldig JSON." },
                    new { role = "user", content = BouwPrompt(nieuweLesTekst, kandidaten) }
                },
                temperature = 0.1,
                response_format = new { type = "json_object" }
            };

            using var content = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");
            using var response = await client.PostAsync("https://api.openai.com/v1/chat/completions", content, cancellationToken);
            response.EnsureSuccessStatusCode();

            var responseJson = await response.Content.ReadAsStringAsync(cancellationToken);
            using var doc = JsonDocument.Parse(responseJson);
            var messageContent = doc.RootElement
                .GetProperty("choices")[0]
                .GetProperty("message")
                .GetProperty("content")
                .GetString() ?? "{}";

            return ParseAiMatches(messageContent);
        }

        private async Task<IReadOnlyList<(Guid KandidaatId, double Score, string Reden)>> VergelijkViaAnthropicAsync(
            string nieuweLesTekst,
            IReadOnlyList<LesDuplicaatAiKandidaat> kandidaten,
            CancellationToken cancellationToken)
        {
            var apiKey = _configuration["AI:Anthropic:ApiKey"] ?? _configuration["AI:ApiKey"]
                ?? throw new InvalidOperationException("AI API key niet geconfigureerd.");
            var model = _configuration["AI:Anthropic:Model"] ?? "claude-3-5-haiku-20241022";

            using var client = new HttpClient();
            client.DefaultRequestHeaders.Add("x-api-key", apiKey);
            client.DefaultRequestHeaders.Add("anthropic-version", "2023-06-01");

            var requestBody = new
            {
                model,
                max_tokens = 2048,
                temperature = 0.1,
                system = "Je bent een onderwijs-expert die semantische duplicaten in lesmateriaal detecteert. Antwoord alleen in geldig JSON.",
                messages = new[]
                {
                    new { role = "user", content = BouwPrompt(nieuweLesTekst, kandidaten) }
                }
            };

            using var content = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");
            using var response = await client.PostAsync("https://api.anthropic.com/v1/messages", content, cancellationToken);
            response.EnsureSuccessStatusCode();

            var responseJson = await response.Content.ReadAsStringAsync(cancellationToken);
            using var doc = JsonDocument.Parse(responseJson);
            var messageContent = doc.RootElement
                .GetProperty("content")[0]
                .GetProperty("text")
                .GetString() ?? "{}";

            return ParseAiMatches(messageContent);
        }

        private async Task<IReadOnlyList<(Guid KandidaatId, double Score, string Reden)>> VergelijkViaGeminiAsync(
            string nieuweLesTekst,
            IReadOnlyList<LesDuplicaatAiKandidaat> kandidaten,
            CancellationToken cancellationToken)
        {
            var apiKey = _configuration["AI:Gemini:ApiKey"] ?? _configuration["AI:ApiKey"]
                ?? throw new InvalidOperationException("AI API key niet geconfigureerd.");
            var model = _configuration["AI:Gemini:Model"] ?? _configuration["AI:Model"] ?? "gemini-1.5-flash";

            using var client = new HttpClient();
            var url = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={Uri.EscapeDataString(apiKey)}";

            var requestBody = new
            {
                contents = new[]
                {
                    new
                    {
                        parts = new[]
                        {
                            new { text = "Je bent een onderwijs-expert die semantische duplicaten in lesmateriaal detecteert. Antwoord alleen in geldig JSON.\n\n" + BouwPrompt(nieuweLesTekst, kandidaten) }
                        }
                    }
                },
                generationConfig = new
                {
                    temperature = 0.1,
                    responseMimeType = "application/json"
                }
            };

            using var content = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");
            using var response = await client.PostAsync(url, content, cancellationToken);
            response.EnsureSuccessStatusCode();

            var responseJson = await response.Content.ReadAsStringAsync(cancellationToken);
            using var doc = JsonDocument.Parse(responseJson);
            var messageContent = doc.RootElement
                .GetProperty("candidates")[0]
                .GetProperty("content")
                .GetProperty("parts")[0]
                .GetProperty("text")
                .GetString() ?? "{}";

            return ParseAiMatches(messageContent);
        }

        private static string BouwPrompt(string nieuweLesTekst, IReadOnlyList<LesDuplicaatAiKandidaat> kandidaten)
        {
            var kandidatenBlok = string.Join(
                "\n\n",
                kandidaten.Select(k =>
                    $"KANDIDAAT_ID: {k.Id}\nTitel: {k.Titel}\nSamenvatting:\n{k.Samenvatting}"));

            return """
                Vergelijk de NIEUWE LES met de KANDIDATEN. Markeer een kandidaat als duplicaat wanneer de inhoudelijke leerstof (doelen, onderwerpen, opdrachten, structuur) in grote mate overeenkomt, ook als formulering, volgorde of titel verschillen.

                Niet als duplicaat: alleen hetzelfde vak/niveau, losse overlap van 1-2 zinnen, of een andere les over een ander onderwerp.

                NIEUWE LES:
                """ + nieuweLesTekst + """

                KANDIDATEN:
                """ + kandidatenBlok + """

                Geef JSON met exact deze structuur:
                {
                  "matches": [
                    {
                      "kandidaatId": "guid-string",
                      "isDuplicaat": true,
                      "score": 0.85,
                      "reden": "korte Nederlandse uitleg waarom dit inhoudelijk hetzelfde is"
                    }
                  ]
                }

                Regels:
                - Alleen kandidaten opnemen met isDuplicaat=true en score >= 0.65
                - score tussen 0.0 en 1.0 (1.0 = vrijwel identieke leerstof)
                - Geen markdown, alleen JSON
                """;
        }

        private static IReadOnlyList<(Guid KandidaatId, double Score, string Reden)> ParseAiMatches(string json)
        {
            var cleaned = json.Trim();
            if (cleaned.StartsWith("```"))
            {
                var lines = cleaned.Split('\n');
                cleaned = string.Join('\n', lines.Skip(1).TakeWhile(l => !l.StartsWith("```")));
            }

            using var doc = JsonDocument.Parse(cleaned);
            if (!doc.RootElement.TryGetProperty("matches", out var matchesElement)
                || matchesElement.ValueKind != JsonValueKind.Array)
            {
                return [];
            }

            var result = new List<(Guid, double, string)>();
            foreach (var item in matchesElement.EnumerateArray())
            {
                if (!item.TryGetProperty("isDuplicaat", out var dupEl) || !dupEl.GetBoolean())
                    continue;

                if (!item.TryGetProperty("kandidaatId", out var idEl))
                    continue;

                var idText = idEl.GetString();
                if (!Guid.TryParse(idText, out var kandidaatId))
                    continue;

                var score = item.TryGetProperty("score", out var scoreEl) && scoreEl.TryGetDouble(out var s)
                    ? Math.Clamp(s, 0, 1)
                    : 0.65;

                if (score < 0.65)
                    continue;

                var reden = item.TryGetProperty("reden", out var redenEl)
                    ? redenEl.GetString() ?? "Inhoudelijk vergelijkbaar met bestaande les."
                    : "Inhoudelijk vergelijkbaar met bestaande les.";

                result.Add((kandidaatId, score, reden));
            }

            return result;
        }
    }
}
