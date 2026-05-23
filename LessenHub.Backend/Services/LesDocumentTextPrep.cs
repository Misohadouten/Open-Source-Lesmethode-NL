using System.Text;
using System.Text.RegularExpressions;
using UglyToad.PdfPig.Content;

namespace LessenHub.Backend.Services;

/// <summary>
/// Normaliseert ruwe documenttekst (vooral PDF) zodat de template-parser regels en labels herkent.
/// </summary>
internal static class LesDocumentTextPrep
{
    private static readonly string[] LabelPatterns =
    [
        "Lessenserie",
        "Omschrijving",
        "Titel van de les",
        "Titel",
        "Tijdsduur",
        "Lesduur",
        "Leerdoelen",
        "Leerdoel",
        "Introductie",
        "Inhoud van de les",
        "Inhoud",
        "Slot van de les",
        "Slot",
        "Afsluiting en reflectie",
        "Afsluiting",
        "Doel van de les",
        "Lesopzet",
        "Bronnen",
        "Literatuurlijst",
        "Schoolniveau",
        "Niveau",
        "Taalniveau",
        "Leerjaar",
    ];

    public static string BuildPdfPageText(Page page)
    {
        var words = page.GetWords().ToList();
        if (words.Count > 0)
        {
            return BuildTextFromWordsByLine(words);
        }

        var pageText = page.Text;
        return string.IsNullOrWhiteSpace(pageText) ? string.Empty : pageText;
    }

    public static string BuildTextFromWordsByLine(IReadOnlyList<Word> words)
    {
        if (words.Count == 0)
        {
            return string.Empty;
        }

        var avgHeight = words.Average(w => w.BoundingBox.Height);
        var lineTolerance = Math.Max(3.0, avgHeight * 0.5);

        var lineGroups = new List<WordLineGroup>();

        foreach (var word in words)
        {
            if (string.IsNullOrWhiteSpace(word.Text))
            {
                continue;
            }

            var y = word.BoundingBox.Bottom;
            var group = lineGroups.FirstOrDefault(g => Math.Abs(g.CenterY - y) <= lineTolerance);
            if (group is null)
            {
                group = new WordLineGroup { CenterY = y };
                lineGroups.Add(group);
            }

            group.Words.Add(word);
            group.CenterY = group.Words.Average(w => w.BoundingBox.Bottom);
        }

        var sb = new StringBuilder();
        foreach (var group in lineGroups.OrderByDescending(g => g.CenterY))
        {
            var ordered = group.Words
                .OrderBy(w => w.BoundingBox.Left)
                .Where(w => !string.IsNullOrWhiteSpace(w.Text))
                .ToList();

            if (ordered.Count == 0)
            {
                continue;
            }

            var line = FormatPdfLineWithColumns(ordered);
            if (line.Length > 0)
            {
                sb.AppendLine(line);
            }
        }

        return sb.ToString().TrimEnd();
    }

    /// <summary>
    /// PDF-tabel: label links, tekst rechts (grote horizontale tussenruimte) → twee regels.
    /// </summary>
    private static string FormatPdfLineWithColumns(IReadOnlyList<Word> ordered)
    {
        var segments = SplitWordsIntoColumnSegments(ordered);
        if (segments.Count >= 2
            && LesTemplateExtractorService.TryResolveFieldLabel(segments[0], out _))
        {
            return segments[0] + "\n" + string.Join(" ", segments.Skip(1));
        }

        return string.Join(" ", ordered.Select(w => w.Text.Trim()));
    }

    private static List<string> SplitWordsIntoColumnSegments(IReadOnlyList<Word> ordered)
    {
        if (ordered.Count == 0)
        {
            return [];
        }

        var avgWidth = ordered.Average(w => Math.Max(w.BoundingBox.Width, 4));
        var gapThreshold = Math.Max(18, avgWidth * 2.2);

        var segments = new List<StringBuilder> { new() };

        for (var i = 0; i < ordered.Count; i++)
        {
            if (i > 0)
            {
                var gap = ordered[i].BoundingBox.Left - ordered[i - 1].BoundingBox.Right;
                if (gap > gapThreshold)
                {
                    segments.Add(new StringBuilder());
                }
                else if (segments[^1].Length > 0)
                {
                    segments[^1].Append(' ');
                }
            }

            segments[^1].Append(ordered[i].Text.Trim());
        }

        return segments
            .Select(s => s.ToString().Trim())
            .Where(s => s.Length > 0)
            .ToList();
    }

    /// <summary>
    /// Zet tabelrijen en kolom-layout om naar label + inhoud op aparte regels (zonder dubbele punt).
    /// </summary>
    public static IEnumerable<string> ExpandTableAndColumnRows(IEnumerable<string> lines)
    {
        foreach (var raw in lines)
        {
            var line = raw.Trim();
            if (line.Length == 0)
            {
                yield return line;
                continue;
            }

            if (line.Contains('\t'))
            {
                yield return line;
                continue;
            }

            var columnParts = Regex.Split(line, @"\s{2,}")
                .Select(p => p.Trim())
                .Where(p => p.Length > 0)
                .ToList();

            if (columnParts.Count >= 2
                && LesTemplateExtractorService.TryResolveFieldLabel(columnParts[0], out _))
            {
                yield return columnParts[0];
                yield return string.Join(" ", columnParts.Skip(1));
                continue;
            }

            yield return line;
        }
    }

    /// <summary>Vervangt veelvoorkomende PDF-encodingtekens zonder inhoud te verwijderen.</summary>
    public static string NormalizePdfEncoding(string text)
    {
        if (string.IsNullOrEmpty(text))
        {
            return string.Empty;
        }

        var sb = new StringBuilder(text.Length);
        foreach (var ch in text)
        {
            sb.Append(ch switch
            {
                '\u00A0' or '\u2007' or '\u202F' => ' ',
                '\u2018' or '\u2019' or '\u201A' or '\u201B' => '\'',
                '\u201C' or '\u201D' or '\u201E' or '\u201F' => '"',
                '\u2013' or '\u2014' or '\u2212' => '-',
                '\u2022' or '\u2023' or '\u25E6' or '\u25AA' or '\u25CF' => '•',
                '\u00AD' => '-',
                '\uFFFD' => ' ',
                _ when char.IsControl(ch) && ch != '\n' && ch != '\r' && ch != '\t' => ' ',
                _ => ch,
            });
        }

        return sb.ToString();
    }

    public static string InjectLineBreaksBeforeLabels(string text)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            return string.Empty;
        }

        var normalized = NormalizePdfEncoding(text).Replace("\r\n", "\n").Replace('\r', '\n');

        foreach (var label in LabelPatterns.OrderByDescending(l => l.Length))
        {
            normalized = Regex.Replace(
                normalized,
                $@"(?<!\n)\s*({Regex.Escape(label)})\s*(\(|:)",
                "\n$1$2",
                RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);

            // Koppen zonder dubbele punt (eigen regel), veelvoorkomend in PDF
            normalized = Regex.Replace(
                normalized,
                $@"(?<!\n)\s+({Regex.Escape(label)})\s*(?=\n|$)",
                "\n$1",
                RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);
        }

        // Bullets uit PDF (• Introductie: …)
        normalized = Regex.Replace(
            normalized,
            @"(?<!\n)\s*([•\*\-–—])\s+",
            "\n$1 ",
            RegexOptions.CultureInvariant);

        return normalized;
    }

    private sealed class WordLineGroup
    {
        public double CenterY { get; set; }
        public List<Word> Words { get; } = [];
    }
}
