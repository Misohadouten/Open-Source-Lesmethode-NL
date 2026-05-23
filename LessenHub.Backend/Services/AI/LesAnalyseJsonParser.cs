using System.Text.Json;
using System.Text.RegularExpressions;

namespace LessenHub.Backend.Services.AI;

/// <summary>
/// Parseert AI-antwoorden veilig naar een volledig <see cref="LesAnalyseResultaat"/> (geen null-crash bij ontbrekende velden).
/// </summary>
public static class LesAnalyseJsonParser
{
    private static readonly JsonSerializerOptions DeserializeOptions = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    public static LesAnalyseResultaat Parse(string rawContent, ILogger? logger = null)
    {
        if (string.IsNullOrWhiteSpace(rawContent))
        {
            return Normalize(new LesAnalyseResultaat());
        }

        try
        {
            var cleaned = ExtractJsonBlock(rawContent);
            if (string.IsNullOrWhiteSpace(cleaned))
            {
                return Normalize(new LesAnalyseResultaat());
            }

            using var doc = JsonDocument.Parse(cleaned);
            var mapped = MapFromElement(ResolvePayloadRoot(doc.RootElement));
            return Normalize(mapped);
        }
        catch (JsonException ex)
        {
            logger?.LogWarning(ex, "AI JSON parse mislukt, probeer fallback-deserialisatie");
            return Normalize(TryDeserializeFallback(rawContent) ?? new LesAnalyseResultaat());
        }
        catch (Exception ex)
        {
            logger?.LogWarning(ex, "Onverwachte fout bij AI JSON parse");
            return Normalize(new LesAnalyseResultaat());
        }
    }

    public static LesAnalyseResultaat Normalize(LesAnalyseResultaat r)
    {
        r.LessenSerieTitel = TrimOrNull(r.LessenSerieTitel);
        r.Titel = TrimOrNull(r.Titel);
        r.Introductie = TrimOrNull(r.Introductie);
        r.Inhoud = TrimOrNull(r.Inhoud);
        r.Slot = TrimOrNull(r.Slot);
        r.Leerdoelen = (r.Leerdoelen ?? [])
            .Where(n => n is >= 0 and <= 9)
            .Distinct()
            .OrderBy(n => n)
            .ToList();
        r.Literatuurlijst = (r.Literatuurlijst ?? [])
            .Where(s => !string.IsNullOrWhiteSpace(s))
            .Select(s => s.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
        r.TijdsDuurMinuten = r.TijdsDuurMinuten is > 0 and <= 600 ? r.TijdsDuurMinuten : null;
        r.SchoolNiveau = r.SchoolNiveau is >= 0 and <= 5 ? r.SchoolNiveau : null;
        r.TaalNiveau = r.TaalNiveau is >= 0 and <= 5 ? r.TaalNiveau : null;
        r.Leerjaar = r.Leerjaar is >= 0 and <= 5 ? r.Leerjaar : null;
        r.Confidence = double.IsFinite(r.Confidence) ? Math.Clamp(r.Confidence, 0, 1) : 0;
        return r;
    }

    public static LesAnalyseResultaat MergePreferExisting(LesAnalyseResultaat primary, LesAnalyseResultaat supplement)
    {
        return Normalize(new LesAnalyseResultaat
        {
            LessenSerieTitel = Coalesce(primary.LessenSerieTitel, supplement.LessenSerieTitel),
            Titel = Coalesce(primary.Titel, supplement.Titel),
            Introductie = Coalesce(primary.Introductie, supplement.Introductie),
            Inhoud = Coalesce(primary.Inhoud, supplement.Inhoud),
            Slot = Coalesce(primary.Slot, supplement.Slot),
            Leerdoelen = primary.Leerdoelen.Count > 0 ? primary.Leerdoelen : supplement.Leerdoelen,
            SchoolNiveau = primary.SchoolNiveau ?? supplement.SchoolNiveau,
            TaalNiveau = primary.TaalNiveau ?? supplement.TaalNiveau,
            Leerjaar = primary.Leerjaar ?? supplement.Leerjaar,
            TijdsDuurMinuten = primary.TijdsDuurMinuten ?? supplement.TijdsDuurMinuten,
            Literatuurlijst = primary.Literatuurlijst.Count > 0 ? primary.Literatuurlijst : supplement.Literatuurlijst,
            Confidence = Math.Max(primary.Confidence, supplement.Confidence),
        });
    }

    private static string? Coalesce(string? a, string? b) => !string.IsNullOrWhiteSpace(a) ? a.Trim() : TrimOrNull(b);

    private static string? TrimOrNull(string? v)
    {
        if (string.IsNullOrWhiteSpace(v)) return null;
        return v.Trim();
    }

    private static string ExtractJsonBlock(string raw)
    {
        var trimmed = raw.Trim();
        if (trimmed.StartsWith("```", StringComparison.Ordinal))
        {
            var lines = trimmed.Split('\n');
            trimmed = string.Join('\n', lines.Skip(1).TakeWhile(l => !l.TrimStart().StartsWith("```")));
        }

        var firstBrace = trimmed.IndexOf('{');
        var lastBrace = trimmed.LastIndexOf('}');
        if (firstBrace >= 0 && lastBrace > firstBrace)
        {
            return trimmed[firstBrace..(lastBrace + 1)];
        }

        return trimmed;
    }

    private static LesAnalyseResultaat TryDeserializeFallback(string raw)
    {
        try
        {
            var cleaned = ExtractJsonBlock(raw);
            return JsonSerializer.Deserialize<LesAnalyseResultaat>(cleaned, DeserializeOptions)
                   ?? new LesAnalyseResultaat();
        }
        catch
        {
            return new LesAnalyseResultaat();
        }
    }

    private static JsonElement ResolvePayloadRoot(JsonElement root)
    {
        if (root.ValueKind != JsonValueKind.Object)
        {
            return root;
        }

        foreach (var wrapKey in new[] { "data", "result", "resultaat", "lesson", "les" })
        {
            if (root.TryGetProperty(wrapKey, out var nested) && nested.ValueKind == JsonValueKind.Object)
            {
                return nested;
            }
        }

        return root;
    }

    private static LesAnalyseResultaat MapFromElement(JsonElement el)
    {
        if (el.ValueKind != JsonValueKind.Object)
        {
            return new LesAnalyseResultaat();
        }

        var title = GetString(el, "title", "Title", "titel", "Titel");
        var description = GetString(el, "description", "Description", "omschrijving", "Omschrijving");
        var introduction = GetString(el, "introduction", "Introduction", "intro", "Intro", "introductie", "Introductie", "inleiding", "Inleiding");
        var content = GetString(el, "content", "Content", "inhoud", "Inhoud", "kern", "Kern", "lesinhoud", "Lesinhoud");
        var closing = GetString(el, "closing", "Closing", "slot", "Slot", "afsluiting", "Afsluiting");
        var durationText = GetString(el, "duration", "Duration", "tijdsDuur", "TijdsDuur", "duur", "Duur");
        var levelText = GetString(el, "level", "Level", "schoolniveau", "Schoolniveau", "niveau", "Niveau");
        var languageLevelText = GetString(el, "languageLevel", "LanguageLevel", "taalniveau", "Taalniveau", "cefr", "CEFR");

        var introductie = introduction;
        if (!string.IsNullOrWhiteSpace(description))
        {
            introductie = string.IsNullOrWhiteSpace(introductie)
                ? description
                : description + "\n\n" + introductie;
        }

        var result = new LesAnalyseResultaat
        {
            LessenSerieTitel = GetString(el, "lessenSerieTitel", "LessenSerieTitel", "lessenserie", "Lessenserie"),
            Titel = title,
            Introductie = introductie,
            Inhoud = content,
            Slot = closing,
            Leerdoelen = ParseLeerdoelen(el),
            SchoolNiveau = GetInt(el, "schoolNiveau", "SchoolNiveau") ?? ParseNiveauFromText(levelText),
            TaalNiveau = GetInt(el, "taalNiveau", "TaalNiveau") ?? ParseNiveauFromText(languageLevelText),
            Leerjaar = GetInt(el, "leerjaar", "Leerjaar"),
            TijdsDuurMinuten = ParseTijdsDuur(el) ?? ParseTijdsDuurFromText(durationText),
            Literatuurlijst = ParseStringList(el, "literatuurlijst", "Literatuurlijst", "bronnen", "Bronnen"),
            Confidence = GetDouble(el, "confidence", "Confidence") ?? 0,
        };

        ApplyTitleAndSeriesFallbacks(result);
        return result;
    }

    private static void ApplyTitleAndSeriesFallbacks(LesAnalyseResultaat result)
    {
        if (!string.IsNullOrWhiteSpace(result.Titel) && string.IsNullOrWhiteSpace(result.LessenSerieTitel))
        {
            result.LessenSerieTitel = result.Titel;
        }

        if (string.IsNullOrWhiteSpace(result.Titel) && !string.IsNullOrWhiteSpace(result.LessenSerieTitel))
        {
            result.Titel = result.LessenSerieTitel;
        }
    }

    private static int? ParseNiveauFromText(string? text)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            return null;
        }

        if (int.TryParse(text.Trim(), out var n) && n is >= 0 and <= 5)
        {
            return n;
        }

        var t = text.Trim().ToLowerInvariant();
        if (t.Contains("vmbo")) return 0;
        if (t.Contains("havo")) return 1;
        if (t.Contains("vwo")) return 2;
        if (t.Contains("mbo")) return 3;
        if (t.Contains("a1")) return 0;
        if (t.Contains("a2")) return 1;
        if (t.Contains("b1")) return 2;
        if (t.Contains("b2")) return 3;
        if (t.Contains("c1")) return 4;
        if (t.Contains("c2")) return 5;

        return null;
    }

    private static int? ParseTijdsDuurFromText(string? text)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            return null;
        }

        var match = Regex.Match(text, @"(\d{1,3})");
        if (match.Success && int.TryParse(match.Groups[1].Value, out var mins) && mins is > 0 and <= 600)
        {
            return mins;
        }

        return null;
    }

    private static string? GetString(JsonElement el, params string[] names)
    {
        foreach (var name in names)
        {
            if (!el.TryGetProperty(name, out var prop))
            {
                continue;
            }

            var s = CoerceToString(prop);
            if (!string.IsNullOrWhiteSpace(s))
            {
                return s;
            }
        }

        return null;
    }

    private static string? CoerceToString(JsonElement prop)
    {
        return prop.ValueKind switch
        {
            JsonValueKind.String => prop.GetString(),
            JsonValueKind.Number => prop.GetRawText(),
            JsonValueKind.True => "true",
            JsonValueKind.False => "false",
            _ => null,
        };
    }

    private static int? GetInt(JsonElement el, params string[] names)
    {
        foreach (var name in names)
        {
            if (!el.TryGetProperty(name, out var prop))
            {
                continue;
            }

            if (prop.ValueKind == JsonValueKind.Number && prop.TryGetInt32(out var n))
            {
                return n;
            }

            if (prop.ValueKind == JsonValueKind.String && int.TryParse(prop.GetString(), out var parsed))
            {
                return parsed;
            }
        }

        return null;
    }

    private static double? GetDouble(JsonElement el, params string[] names)
    {
        foreach (var name in names)
        {
            if (!el.TryGetProperty(name, out var prop))
            {
                continue;
            }

            if (prop.ValueKind == JsonValueKind.Number && prop.TryGetDouble(out var d))
            {
                return d;
            }
        }

        return null;
    }

    private static int? ParseTijdsDuur(JsonElement el)
    {
        var direct = GetInt(el, "tijdsDuurMinuten", "TijdsDuurMinuten", "duurMinuten", "DuurMinuten");
        if (direct is > 0 and <= 600)
        {
            return direct;
        }

        var text = GetString(el, "tijdsDuur", "TijdsDuur", "duur", "Duur");
        if (string.IsNullOrWhiteSpace(text))
        {
            return null;
        }

        var match = Regex.Match(text, @"(\d{1,3})");
        if (match.Success && int.TryParse(match.Groups[1].Value, out var mins) && mins is > 0 and <= 600)
        {
            return mins;
        }

        return null;
    }

    private static List<int> ParseLeerdoelen(JsonElement el)
    {
        var result = new HashSet<int>();

        foreach (var name in new[] { "leerdoelen", "Leerdoelen", "leerdoel", "Leerdoel", "learningGoals", "LearningGoals" })
        {
            if (!el.TryGetProperty(name, out var prop))
            {
                continue;
            }

            if (prop.ValueKind == JsonValueKind.Array)
            {
                foreach (var item in prop.EnumerateArray())
                {
                    AddLeerdoelToken(result, item);
                }
            }
            else if (prop.ValueKind == JsonValueKind.String)
            {
                foreach (var part in (prop.GetString() ?? "").Split(',', ';'))
                {
                    AddLeerdoelName(result, part.Trim());
                }
            }
        }

        return result.OrderBy(n => n).ToList();
    }

    private static void AddLeerdoelToken(HashSet<int> result, JsonElement item)
    {
        if (item.ValueKind == JsonValueKind.Number && item.TryGetInt32(out var n) && n is >= 0 and <= 9)
        {
            result.Add(n);
            return;
        }

        if (item.ValueKind == JsonValueKind.String)
        {
            AddLeerdoelName(result, item.GetString() ?? "");
        }
    }

    private static void AddLeerdoelName(HashSet<int> result, string token)
    {
        if (int.TryParse(token, out var n) && n is >= 0 and <= 9)
        {
            result.Add(n);
            return;
        }

        var key = Regex.Replace(token.ToLowerInvariant(), @"[^a-z0-9]", "");
        var map = new Dictionary<string, int>(StringComparer.Ordinal)
        {
            ["begrijpendlezen"] = 0,
            ["schrijven"] = 1,
            ["luisteren"] = 2,
            ["spreken"] = 3,
            ["woordenschat"] = 4,
            ["grammatica"] = 5,
            ["cultuurbegrip"] = 6,
            ["kritischdenken"] = 7,
            ["samenwerken"] = 8,
            ["probleemoplossing"] = 9,
        };

        if (map.TryGetValue(key, out var mapped))
        {
            result.Add(mapped);
        }
    }

    private static List<string> ParseStringList(JsonElement el, params string[] names)
    {
        foreach (var name in names)
        {
            if (!el.TryGetProperty(name, out var prop) || prop.ValueKind != JsonValueKind.Array)
            {
                continue;
            }

            return prop.EnumerateArray()
                .Select(CoerceToString)
                .Where(s => !string.IsNullOrWhiteSpace(s))
                .Select(s => s!.Trim())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();
        }

        return [];
    }
}
