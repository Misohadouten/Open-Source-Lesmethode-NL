using LessenHub.Backend.Services.AI;
using System.Text.RegularExpressions;

namespace LessenHub.Backend.Services
{
    /// <summary>
    /// Alleen opschonen van label-vervuiling — nooit velden vullen vanuit andere documentdelen.
    /// </summary>
    public static class LesAnalysePostProcessor
    {
        private static readonly Regex TitelLabelPrefix = new(
            @"^(?i)\s*(?:leerdoelen|titel|onderwerp|lestitel)\s*[:\-\.]?\s*",
            RegexOptions.CultureInvariant);

        private static readonly Regex TitelGluedLeerdoelen = new(
            @"^(?i)leerdoelen(?=[\p{Lu}])",
            RegexOptions.CultureInvariant);

        public static LesAnalyseResultaat Opschonen(LesAnalyseResultaat resultaat)
        {
            if (!string.IsNullOrWhiteSpace(resultaat.Titel))
            {
                var titel = resultaat.Titel.Trim();
                titel = TitelGluedLeerdoelen.Replace(titel, string.Empty);
                titel = TitelLabelPrefix.Replace(titel, string.Empty).Trim();
                resultaat.Titel = titel.Length > 0 ? titel : null;
            }

            resultaat.Introductie = StripSectionLabel(resultaat.Introductie, "introductie", "inleiding", "start");
            resultaat.Inhoud = StripSectionLabel(resultaat.Inhoud, "inhoud", "inhoud van de les", "kern", "lesinhoud");
            resultaat.Slot = StripSectionLabel(resultaat.Slot, "slot", "slot van de les", "afsluiting", "reflectie");

            return resultaat;
        }

        private static string? StripSectionLabel(string? value, params string[] labels)
        {
            if (string.IsNullOrWhiteSpace(value)) return value;
            var trimmed = value.Trim();
            foreach (var label in labels)
            {
                var pattern = $@"^(?i)\s*(?:\d+[\).\-]\s*)?{Regex.Escape(label)}(?:\s*\(\s*\d+[^)]*\))?\s*[:\-\.]?\s*";
                trimmed = Regex.Replace(trimmed, pattern, string.Empty, RegexOptions.CultureInvariant);
            }
            return trimmed.Trim();
        }
    }
}
