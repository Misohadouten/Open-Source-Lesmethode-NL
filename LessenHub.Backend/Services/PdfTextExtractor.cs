using System.Text;
using System.Text.RegularExpressions;
using UglyToad.PdfPig;
using UglyToad.PdfPig.Content;

namespace LessenHub.Backend.Services;

/// <summary>
/// Extraheert leesbare tekst uit PDF-bytes (geen readAsText / raw streams).
/// </summary>
public static class PdfTextExtractor
{
    public static string ExtractFromBytes(byte[] pdfBytes)
    {
        if (pdfBytes.Length == 0)
        {
            return string.Empty;
        }

        using var document = PdfDocument.Open(pdfBytes);
        var pageTexts = new List<string>();

        foreach (var page in document.GetPages())
        {
            var pageText = ExtractPage(page);
            if (!string.IsNullOrWhiteSpace(pageText))
            {
                pageTexts.Add(pageText);
            }
        }

        var combined = string.Join("\n\n", pageTexts);
        combined = LesDocumentTextPrep.NormalizePdfEncoding(combined);
        combined = LesDocumentTextPrep.InjectLineBreaksBeforeLabels(combined);
        return combined.Trim();
    }

    private static string ExtractPage(Page page)
    {
        var candidates = new List<(string Text, int Score)>
        {
            ScoreCandidate(ExtractViaWordsByLine(page)),
            ScoreCandidate(ExtractViaPageText(page)),
            ScoreCandidate(ExtractViaLetters(page)),
            ScoreCandidate(ExtractViaSimpleWordJoin(page)),
        };

        var best = candidates
            .Where(c => !string.IsNullOrWhiteSpace(c.Text))
            .OrderByDescending(c => c.Score)
            .ThenByDescending(c => c.Text.Length)
            .Select(c => c.Text)
            .FirstOrDefault();

        return best ?? string.Empty;
    }

    private static int ScoreCandidate(string text)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            return 0;
        }

        var score = Math.Min(text.Length, 5000);
        score += text.Count(c => c == '\n') * 8;

        if (text.Contains("introductie", StringComparison.OrdinalIgnoreCase)) score += 40;
        if (text.Contains("inhoud", StringComparison.OrdinalIgnoreCase)) score += 40;
        if (text.Contains("lessenserie", StringComparison.OrdinalIgnoreCase)) score += 30;
        if (text.Contains("afsluiting", StringComparison.OrdinalIgnoreCase)
            || text.Contains("slot", StringComparison.OrdinalIgnoreCase))
        {
            score += 30;
        }

        if (text.Contains('\uFFFD') || text.Contains("%PDF"))
        {
            score -= 500;
        }

        return score;
    }

    private static string ExtractViaWordsByLine(Page page)
    {
        var words = page.GetWords().ToList();
        if (words.Count == 0)
        {
            return string.Empty;
        }

        return LesDocumentTextPrep.BuildTextFromWordsByLine(words);
    }

    private static string ExtractViaPageText(Page page)
    {
        var raw = page.Text;
        if (string.IsNullOrWhiteSpace(raw))
        {
            return string.Empty;
        }

        var withBreaks = Regex.Replace(raw, @"[ \t]+", " ");
        withBreaks = Regex.Replace(withBreaks, @"(\s)(Lessenserie|Introductie|Inhoud|Afsluiting|Slot|Titel|Leerdoelen)\s*:", "\n$2:", RegexOptions.IgnoreCase);
        return withBreaks.Trim();
    }

    private static string ExtractViaSimpleWordJoin(Page page)
    {
        var words = page.GetWords().ToList();
        if (words.Count == 0)
        {
            return string.Empty;
        }

        return string.Join(' ', words.Select(w => w.Text).Where(t => !string.IsNullOrWhiteSpace(t)));
    }

    private static string ExtractViaLetters(Page page)
    {
        var letters = page.Letters
            .Where(l => !string.IsNullOrWhiteSpace(l.Value))
            .ToList();

        if (letters.Count == 0)
        {
            return string.Empty;
        }

        var avgHeight = letters.Average(l => l.GlyphRectangle.Height);
        var tolerance = Math.Max(2.5, avgHeight * 0.45);

        var groups = new List<LetterLineGroup>();

        foreach (var letter in letters)
        {
            var y = letter.GlyphRectangle.Bottom;
            var group = groups.FirstOrDefault(g => Math.Abs(g.CenterY - y) <= tolerance);
            if (group is null)
            {
                group = new LetterLineGroup { CenterY = y };
                groups.Add(group);
            }

            group.Letters.Add(letter);
            group.CenterY = group.Letters.Average(l => l.GlyphRectangle.Bottom);
        }

        var sb = new StringBuilder();
        foreach (var group in groups.OrderByDescending(g => g.CenterY))
        {
            var line = string.Concat(
                group.Letters
                    .OrderBy(l => l.GlyphRectangle.Left)
                    .Select(l => l.Value));

            if (line.Length > 0)
            {
                sb.AppendLine(line);
            }
        }

        return sb.ToString().TrimEnd();
    }

    private sealed class LetterLineGroup
    {
        public double CenterY { get; set; }
        public List<Letter> Letters { get; } = [];
    }
}
