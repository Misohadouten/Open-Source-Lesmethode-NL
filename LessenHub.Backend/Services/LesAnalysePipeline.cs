using LessenHub.Backend.Services.AI;

namespace LessenHub.Backend.Services;

public static class LesAnalysePipeline
{
    public static bool HasUsableData(LesAnalyseResultaat? r)
    {
        if (r is null)
        {
            return false;
        }

        return !string.IsNullOrWhiteSpace(r.Titel)
            || !string.IsNullOrWhiteSpace(r.LessenSerieTitel)
            || !string.IsNullOrWhiteSpace(r.Introductie)
            || !string.IsNullOrWhiteSpace(r.Inhoud)
            || !string.IsNullOrWhiteSpace(r.Slot)
            || (r.Leerdoelen?.Count ?? 0) > 0
            || r.TijdsDuurMinuten is > 0;
    }

    public static string DescribeValidation(LesAnalyseResultaat r)
    {
        var parts = new List<string>();
        if (!string.IsNullOrWhiteSpace(r.Titel)) parts.Add("titel");
        if (!string.IsNullOrWhiteSpace(r.LessenSerieTitel)) parts.Add("lessenserie");
        if (!string.IsNullOrWhiteSpace(r.Introductie)) parts.Add("introductie");
        if (!string.IsNullOrWhiteSpace(r.Inhoud)) parts.Add("inhoud");
        if (!string.IsNullOrWhiteSpace(r.Slot)) parts.Add("slot");
        if ((r.Leerdoelen?.Count ?? 0) > 0) parts.Add("leerdoelen");
        if (r.TijdsDuurMinuten is > 0) parts.Add("duur");

        return parts.Count > 0
            ? $"bruikbaar: {string.Join(", ", parts)}"
            : "geen bruikbare velden";
    }

    public static LesAnalyseResultaat ApplyFinalFallbacks(LesAnalyseResultaat r, string documentText)
    {
        if (string.IsNullOrWhiteSpace(r.Titel))
        {
            r.Titel = TrimToNull(r.LessenSerieTitel)
                ?? ExtractFirstMeaningfulLine(documentText)
                ?? "Concept zonder titel";
        }

        if (string.IsNullOrWhiteSpace(r.LessenSerieTitel) && !string.IsNullOrWhiteSpace(r.Titel))
        {
            r.LessenSerieTitel = r.Titel;
        }

        if (string.IsNullOrWhiteSpace(r.Inhoud) && HasPartialStructure(r) && !string.IsNullOrWhiteSpace(documentText))
        {
            var fallback = documentText.Trim();
            r.Inhoud = fallback.Length > 12000 ? fallback[..12000] : fallback;
        }

        return LesAnalyseJsonParser.Normalize(r);
    }

    private static bool HasPartialStructure(LesAnalyseResultaat r) =>
        !string.IsNullOrWhiteSpace(r.Titel)
        || !string.IsNullOrWhiteSpace(r.LessenSerieTitel)
        || !string.IsNullOrWhiteSpace(r.Introductie)
        || !string.IsNullOrWhiteSpace(r.Slot);

    private static string? ExtractFirstMeaningfulLine(string documentText)
    {
        foreach (var line in documentText.Replace("\r\n", "\n").Split('\n'))
        {
            var trimmed = line.Trim();
            if (trimmed.Length < 4 || trimmed.Length > 120)
            {
                continue;
            }

            if (System.Text.RegularExpressions.Regex.IsMatch(
                    trimmed,
                    @"(?i)^(lessenserie|omschrijving|introductie|inhoud|afsluiting|leerdoel|tijdsduur)\s*:?\s*$"))
            {
                continue;
            }

            return trimmed;
        }

        return null;
    }

    private static string? TrimToNull(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
