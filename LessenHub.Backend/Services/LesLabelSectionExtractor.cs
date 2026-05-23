using System.Text;
using System.Text.RegularExpressions;
using LessenHub.Backend.Services.AI;

namespace LessenHub.Backend.Services;

/// <summary>
/// Haalt lesvelden uit Nederlandse documentlabels (Lessenserie:, Introductie:, …).
/// </summary>
public class LesLabelSectionExtractor
{
    private static readonly Regex SectionLabelRegex = new(
        @"(?im)^\s*(Lessenserie|Omschrijving|Introductie|Inhoud|Afsluiting|Leerdoel(?:en)?|Tijdsduur|Schoolniveau|Taalniveau|Literatuurlijst|Titel(?:\s+van\s+de\s+les)?)\s*:\s*(.*)$",
        RegexOptions.Compiled | RegexOptions.CultureInvariant);

    private static readonly Regex InlineLabelRegex = new(
        @"(?im)\b(Lessenserie|Omschrijving|Introductie|Inhoud|Afsluiting|Leerdoel(?:en)?|Tijdsduur|Schoolniveau|Taalniveau|Literatuurlijst)\s*:\s*",
        RegexOptions.Compiled | RegexOptions.CultureInvariant);

    private static readonly Regex LabelOnlyLineRegex = new(
        @"(?im)^\s*(Lessenserie|Omschrijving|Introductie|Inhoud|Afsluiting|Leerdoel(?:en)?|Tijdsduur|Schoolniveau|Taalniveau|Literatuurlijst)\s*:?\s*$",
        RegexOptions.Compiled | RegexOptions.CultureInvariant);

    public LesAnalyseResultaat Extract(string documentText)
    {
        if (string.IsNullOrWhiteSpace(documentText))
        {
            return new LesAnalyseResultaat();
        }

        var prepared = LesDocumentTextPrep.InjectLineBreaksBeforeLabels(documentText);
        var sections = ParseSections(prepared);
        if (sections.Count == 0)
        {
            sections = ParseSections(documentText);
        }

        if (sections.Count == 0)
        {
            return new LesAnalyseResultaat();
        }

        var result = new LesAnalyseResultaat { Confidence = 0.85 };

        if (sections.TryGetValue("lessenserie", out var serie))
        {
            result.LessenSerieTitel = TrimSection(serie);
        }

        if (sections.TryGetValue("titel", out var titel))
        {
            result.Titel = TrimSection(titel);
        }

        if (sections.TryGetValue("omschrijving", out var omschrijving))
        {
            var oms = TrimSection(omschrijving);
            if (!string.IsNullOrWhiteSpace(oms))
            {
                result.Introductie = string.IsNullOrWhiteSpace(result.Introductie)
                    ? oms
                    : oms + "\n\n" + result.Introductie;
            }
        }

        if (sections.TryGetValue("introductie", out var intro))
        {
            result.Introductie = MergeText(result.Introductie, TrimSection(intro));
        }

        if (sections.TryGetValue("inhoud", out var inhoud))
        {
            result.Inhoud = TrimSection(inhoud);
        }

        if (sections.TryGetValue("afsluiting", out var slot))
        {
            result.Slot = TrimSection(slot);
        }

        if (sections.TryGetValue("leerdoel", out var leerdoel) || sections.TryGetValue("leerdoelen", out leerdoel))
        {
            result.Leerdoelen = ParseLeerdoelText(leerdoel);
        }

        if (sections.TryGetValue("tijdsduur", out var duur))
        {
            result.TijdsDuurMinuten = ParseDuur(duur);
        }

        if (sections.TryGetValue("schoolniveau", out var niveau))
        {
            result.SchoolNiveau = ParseNiveauIndex(niveau);
        }

        if (sections.TryGetValue("taalniveau", out var taal))
        {
            result.TaalNiveau = ParseNiveauIndex(taal);
        }

        if (sections.TryGetValue("literatuurlijst", out var lit))
        {
            result.Literatuurlijst = ParseLiteratuur(lit);
        }

        ApplyTitleFallbacks(result);
        return LesAnalyseJsonParser.Normalize(result);
    }

    private static Dictionary<string, string> ParseSections(string text)
    {
        var normalized = text.Replace("\r\n", "\n").Replace('\r', '\n');
        var sections = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

        var markers = new List<(int Index, int Length, string Key)>();

        foreach (Match match in InlineLabelRegex.Matches(normalized))
        {
            var key = NormalizeLabelKey(match.Groups[1].Value);
            if (key.Length == 0)
            {
                continue;
            }

            markers.Add((match.Index, match.Length, key));
        }

        foreach (Match match in LabelOnlyLineRegex.Matches(normalized))
        {
            var key = NormalizeLabelKey(match.Groups[1].Value);
            if (key.Length == 0)
            {
                continue;
            }

            markers.Add((match.Index, match.Length, key));
        }

        if (markers.Count == 0)
        {
            return sections;
        }

        markers = markers
            .OrderBy(m => m.Index)
            .DistinctBy(m => m.Index)
            .ToList();

        for (var i = 0; i < markers.Count; i++)
        {
            var (index, length, key) = markers[i];
            var contentStart = index + length;
            var contentEnd = i + 1 < markers.Count ? markers[i + 1].Index : normalized.Length;
            var chunk = normalized[contentStart..contentEnd].Trim();

            if (string.IsNullOrWhiteSpace(chunk))
            {
                continue;
            }

            if (sections.TryGetValue(key, out var existing))
            {
                sections[key] = existing + "\n\n" + chunk;
            }
            else
            {
                sections[key] = chunk;
            }
        }

        // Eerste regel met label + waarde op één regel (bijv. "Lessenserie: Naam")
        foreach (Match match in SectionLabelRegex.Matches(normalized))
        {
            var key = NormalizeLabelKey(match.Groups[1].Value);
            var inline = match.Groups[2].Value.Trim();
            if (key.Length == 0 || inline.Length == 0)
            {
                continue;
            }

            if (!sections.ContainsKey(key) || sections[key].Length < inline.Length)
            {
                sections[key] = inline;
            }
        }

        return sections;
    }

    private static string NormalizeLabelKey(string label)
    {
        var cleaned = Regex.Replace(label.Trim().ToLowerInvariant(), @"[^a-z0-9]", "");
        return cleaned switch
        {
            "lessenserie" => "lessenserie",
            "omschrijving" => "omschrijving",
            "introductie" => "introductie",
            "inhoud" => "inhoud",
            "afsluiting" => "afsluiting",
            "leerdoel" or "leerdoelen" => "leerdoel",
            "tijdsduur" => "tijdsduur",
            "schoolniveau" => "schoolniveau",
            "taalniveau" => "taalniveau",
            "literatuurlijst" => "literatuurlijst",
            "titel" or "titelvandelles" => "titel",
            _ => cleaned,
        };
    }

    private static void ApplyTitleFallbacks(LesAnalyseResultaat result)
    {
        if (string.IsNullOrWhiteSpace(result.Titel) && !string.IsNullOrWhiteSpace(result.LessenSerieTitel))
        {
            result.Titel = result.LessenSerieTitel;
        }

        if (string.IsNullOrWhiteSpace(result.LessenSerieTitel) && !string.IsNullOrWhiteSpace(result.Titel))
        {
            result.LessenSerieTitel = result.Titel;
        }
    }

    private static string? TrimSection(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        return value.Trim();
    }

    private static string? MergeText(string? existing, string? addition)
    {
        if (string.IsNullOrWhiteSpace(addition))
        {
            return TrimSection(existing);
        }

        if (string.IsNullOrWhiteSpace(existing))
        {
            return addition;
        }

        return existing.Trim() + "\n\n" + addition.Trim();
    }

    private static List<int> ParseLeerdoelText(string text)
    {
        var result = new HashSet<int>();
        foreach (var part in text.Split(['\n', ',', ';', '•', '-'], StringSplitOptions.RemoveEmptyEntries))
        {
            var token = part.Trim();
            if (token.Length == 0)
            {
                continue;
            }

            if (int.TryParse(token, out var n) && n is >= 0 and <= 9)
            {
                result.Add(n);
                continue;
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
                ["kritischbegrijpendlezen"] = 0,
                ["samenwerken"] = 8,
                ["probleemoplossing"] = 9,
            };

            if (map.TryGetValue(key, out var mapped))
            {
                result.Add(mapped);
            }
        }

        return result.OrderBy(x => x).ToList();
    }

    private static int? ParseDuur(string text)
    {
        var match = Regex.Match(text, @"(\d{1,3})");
        if (match.Success && int.TryParse(match.Groups[1].Value, out var mins) && mins is > 0 and <= 600)
        {
            return mins;
        }

        return null;
    }

    private static int? ParseNiveauIndex(string text)
    {
        var t = text.Trim().ToLowerInvariant();
        if (int.TryParse(t, out var n) && n is >= 0 and <= 5)
        {
            return n;
        }

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

    private static List<string> ParseLiteratuur(string text)
    {
        return text.Split('\n', StringSplitOptions.RemoveEmptyEntries)
            .Select(l => l.Trim())
            .Where(l => l.Length > 2)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
    }
}
