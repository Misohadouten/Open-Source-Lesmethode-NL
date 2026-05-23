using System.Text;
using System.Text.RegularExpressions;
using LessenHub.Backend.Services.AI;

namespace LessenHub.Backend.Services;

/// <summary>
/// Vult lesvelden af uit documentstructuur wanneer er geen letterlijke labels zijn.
/// </summary>
public class LesSemanticExtractorService
{
    private static readonly Regex DurationRegex = new(
        @"(?<m>\d{1,3})\s*(?:min(?:uten)?|m\b)|(?<h>\d{1,2})\s*uur",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);

    private static readonly string[] SlotHints =
    [
        "afsluiting", "slot", "reflectie", "evaluatie", "afronding", "nabespreking", "terugblik",
    ];

    private static readonly string[] IntroHints =
    [
        "introductie", "inleiding", "doel van de les", "start", "opening",
    ];

    private static readonly string[] InhoudHints =
    [
        "inhoud", "lesopzet", "werkvorm", "activiteit", "verwerking", "kern", "deel 1", "deel 2",
    ];

    public LesAnalyseResultaat Extract(string documentText)
    {
        if (string.IsNullOrWhiteSpace(documentText))
        {
            return new LesAnalyseResultaat();
        }

        var paragraphs = SplitParagraphs(documentText);
        if (paragraphs.Count == 0)
        {
            return new LesAnalyseResultaat();
        }

        var blocks = ClassifyBlocks(paragraphs);
        var result = new LesAnalyseResultaat
        {
            Titel = InferTitle(blocks),
            Introductie = InferIntro(blocks),
            Inhoud = InferInhoud(blocks),
            Slot = InferSlot(blocks),
            TijdsDuurMinuten = InferDuration(documentText),
            Leerdoelen = InferLeerdoelen(documentText),
            Literatuurlijst = InferLiteratuur(paragraphs),
            Confidence = 0.55,
        };

        return LesAnalyseJsonParser.Normalize(result);
    }

    public LesAnalyseResultaat FillGaps(LesAnalyseResultaat current, string documentText)
    {
        var semantic = Extract(documentText);
        return LesAnalyseJsonParser.MergePreferExisting(current, semantic);
    }

    private static List<ParagraphBlock> SplitParagraphs(string text)
    {
        var normalized = text.Replace("\r\n", "\n").Replace('\r', '\n');
        var chunks = Regex.Split(normalized, @"\n\s*\n+")
            .Select(p => Regex.Replace(p.Trim(), @"[ \t]+", " "))
            .Where(p => p.Length > 0)
            .ToList();

        if (chunks.Count <= 1)
        {
            chunks = normalized.Split('\n')
                .Select(l => l.Trim())
                .Where(l => l.Length > 0)
                .ToList();
        }

        return chunks
            .Select((p, i) => new ParagraphBlock { Index = i, Text = p })
            .Where(b => !IsMetadataOnly(b.Text))
            .ToList();
    }

    private static bool IsMetadataOnly(string text)
    {
        if (text.Length > 200)
        {
            return false;
        }

        return Regex.IsMatch(
            text,
            @"^(?:(?:school)?niveau|taalniveau|leerjaar|tijdsduur|duur|leerdoelen?|doelgroep|lessenserie)\s*[:.]?\s*[\w\d\s,\-]+$",
            RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);
    }

    private static List<ParagraphBlock> ClassifyBlocks(List<ParagraphBlock> blocks)
    {
        foreach (var block in blocks)
        {
            var lower = block.Text.ToLowerInvariant();
            if (IntroHints.Any(h => lower.StartsWith(h, StringComparison.Ordinal)))
            {
                block.Kind = BlockKind.Intro;
            }
            else if (InhoudHints.Any(h => lower.StartsWith(h, StringComparison.Ordinal)))
            {
                block.Kind = BlockKind.Inhoud;
            }
            else if (SlotHints.Any(h => lower.StartsWith(h, StringComparison.Ordinal)))
            {
                block.Kind = BlockKind.Slot;
            }
            else if (LesTemplateExtractorService.TryResolveFieldLabel(block.Text, out var field))
            {
                block.Kind = field switch
                {
                    "Introductie" => BlockKind.Intro,
                    "Inhoud" => BlockKind.Inhoud,
                    "Slot" => BlockKind.Slot,
                    "Titel" => BlockKind.Title,
                    _ => BlockKind.Body,
                };
            }
        }

        return blocks;
    }

    private static string? InferTitle(List<ParagraphBlock> blocks)
    {
        var titled = blocks.FirstOrDefault(b => b.Kind == BlockKind.Title);
        if (titled != null)
        {
            return StripHeadingPrefix(titled.Text);
        }

        var candidate = blocks.FirstOrDefault(b =>
            b.Kind == BlockKind.Body
            && b.Text.Length is >= 10 and <= 150
            && b.Text.Count(c => c == '.') <= 2
            && !b.Text.Contains('\n'));

        return candidate != null ? TruncateTitle(candidate.Text) : null;
    }

    private static string? InferIntro(List<ParagraphBlock> blocks)
    {
        var intro = blocks.FirstOrDefault(b => b.Kind == BlockKind.Intro);
        if (intro != null)
        {
            return StripHeadingPrefix(intro.Text);
        }

        var bodyBlocks = blocks.Where(b => b.Kind == BlockKind.Body).ToList();
        if (bodyBlocks.Count >= 2)
        {
            return bodyBlocks[0].Text;
        }

        if (bodyBlocks.Count == 1)
        {
            return TakeFirstSentences(bodyBlocks[0].Text, 2);
        }

        return null;
    }

    private static string? InferInhoud(List<ParagraphBlock> blocks)
    {
        var labeled = blocks.Where(b => b.Kind == BlockKind.Inhoud).Select(b => StripHeadingPrefix(b.Text)).ToList();
        if (labeled.Count > 0)
        {
            return string.Join("\n\n", labeled);
        }

        var body = blocks.Where(b => b.Kind == BlockKind.Body).Select(b => b.Text).ToList();
        if (body.Count >= 3)
        {
            return string.Join("\n\n", body.Skip(1).Take(body.Count - 2));
        }

        if (body.Count == 2)
        {
            return body[1];
        }

        if (body.Count == 1)
        {
            var full = body[0];
            var sentences = SplitSentences(full);
            if (sentences.Count > 2)
            {
                return string.Join(" ", sentences.Skip(2));
            }
        }

        return null;
    }

    private static string? InferSlot(List<ParagraphBlock> blocks)
    {
        var slot = blocks.LastOrDefault(b => b.Kind == BlockKind.Slot)
            ?? blocks.LastOrDefault(b => SlotHints.Any(h => b.Text.Contains(h, StringComparison.OrdinalIgnoreCase)));

        if (slot != null)
        {
            return StripHeadingPrefix(slot.Text);
        }

        var body = blocks.Where(b => b.Kind == BlockKind.Body).ToList();
        if (body.Count >= 2)
        {
            var last = body[^1].Text;
            if (last.Length < 600 || SlotHints.Any(h => last.Contains(h, StringComparison.OrdinalIgnoreCase)))
            {
                return last;
            }
        }

        return null;
    }

    private static int? InferDuration(string text)
    {
        var match = DurationRegex.Match(text);
        if (!match.Success)
        {
            return null;
        }

        if (match.Groups["h"].Success && int.TryParse(match.Groups["h"].Value, out var hours))
        {
            var mins = match.Groups["m"].Success && int.TryParse(match.Groups["m"].Value, out var m) ? m : 0;
            return Math.Min(600, hours * 60 + mins);
        }

        if (match.Groups["m"].Success && int.TryParse(match.Groups["m"].Value, out var minutes))
        {
            return minutes is > 0 and <= 600 ? minutes : null;
        }

        return null;
    }

    private static List<int> InferLeerdoelen(string text)
    {
        var found = new HashSet<int>();
        var map = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase)
        {
            ["begrijpend lezen"] = 0,
            ["schrijven"] = 1,
            ["luisteren"] = 2,
            ["spreken"] = 3,
            ["woordenschat"] = 4,
            ["grammatica"] = 5,
            ["cultuurbegrip"] = 6,
            ["kritisch denken"] = 7,
            ["samenwerken"] = 8,
            ["probleemoplossing"] = 9,
        };

        var lower = text.ToLowerInvariant();
        foreach (var kvp in map)
        {
            if (lower.Contains(kvp.Key, StringComparison.Ordinal))
            {
                found.Add(kvp.Value);
            }
        }

        foreach (Match m in Regex.Matches(text, @"\bleerdoel(?:en)?\s*[:\-]?\s*([^\n]+)", RegexOptions.IgnoreCase))
        {
            foreach (Match num in Regex.Matches(m.Groups[1].Value, @"\b([0-9])\b"))
            {
                if (int.TryParse(num.Groups[1].Value, out var n))
                {
                    found.Add(n);
                }
            }
        }

        return found.OrderBy(n => n).ToList();
    }

    private static List<string> InferLiteratuur(List<ParagraphBlock> blocks)
    {
        var bronnen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var block in blocks)
        {
            if (block.Text.Contains("http", StringComparison.OrdinalIgnoreCase)
                || Regex.IsMatch(block.Text, @"\(\s*[^)]*\d{4}", RegexOptions.CultureInvariant))
            {
                foreach (var line in block.Text.Split('\n'))
                {
                    var trimmed = line.Trim().TrimStart('-', '•', '*', ' ');
                    if (trimmed.Length > 4)
                    {
                        bronnen.Add(trimmed);
                    }
                }
            }
        }

        return bronnen.OrderBy(b => b).ToList();
    }

    private static string StripHeadingPrefix(string text)
    {
        var trimmed = text.Trim();
        trimmed = Regex.Replace(trimmed, @"^\s*\d+[\).\-]\s*", string.Empty);
        trimmed = Regex.Replace(
            trimmed,
            @"^(?i)(?:lessenserie|titel(?:\s+van\s+de\s+les)?|introductie|inleiding|inhoud(?:\s+van\s+de\s+les)?|slot(?:\s+van\s+de\s+les)?|afsluiting|lesopzet|doel\s+van\s+de\s+les|leerdoelen?|tijdsduur|duur)\s*(\([^)]*\))?\s*[:\-\.]?\s*",
            string.Empty);
        return trimmed.Trim();
    }

    private static string? TruncateTitle(string text)
    {
        var cleaned = StripHeadingPrefix(text);
        if (cleaned.Length <= 90)
        {
            return cleaned;
        }

        var cut = cleaned[..90];
        var space = cut.LastIndexOf(' ');
        return (space > 30 ? cut[..space] : cut).Trim();
    }

    private static string TakeFirstSentences(string text, int count)
    {
        var sentences = SplitSentences(text);
        return string.Join(" ", sentences.Take(count));
    }

    private static List<string> SplitSentences(string text)
    {
        return Regex.Split(text, @"(?<=[.!?])\s+")
            .Select(s => s.Trim())
            .Where(s => s.Length > 0)
            .ToList();
    }

    private enum BlockKind
    {
        Body,
        Title,
        Intro,
        Inhoud,
        Slot,
    }

    private sealed class ParagraphBlock
    {
        public int Index { get; init; }
        public string Text { get; init; } = string.Empty;
        public BlockKind Kind { get; set; } = BlockKind.Body;
    }
}
