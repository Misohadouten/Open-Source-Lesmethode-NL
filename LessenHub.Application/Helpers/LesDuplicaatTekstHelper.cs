using System.Text.RegularExpressions;
using LessenHub.Domain.Entities;

namespace LessenHub.Application.Helpers;

public static class LesDuplicaatTekstHelper
{
    private static readonly HashSet<string> Stopwoorden = new(StringComparer.OrdinalIgnoreCase)
    {
        "de", "het", "een", "en", "van", "in", "op", "te", "dat", "die", "is", "zijn",
        "was", "waren", "je", "jij", "jullie", "u", "we", "wij", "met", "voor", "naar",
        "als", "bij", "om", "ook", "nog", "dan", "maar", "of", "er", "aan", "uit", "over",
    };

    public static string BouwVolledigeTekst(string titel, string? introductie, string? inhoud, string? slot)
    {
        return string.Join(
            "\n\n",
            new[] { titel, introductie, inhoud, slot }
                .Where(s => !string.IsNullOrWhiteSpace(s))
                .Select(s => s!.Trim()));
    }

    public static string BouwVolledigeTekst(Les les)
        => BouwVolledigeTekst(les.Titel, les.Introductie, les.Inhoud, les.Slot);

    public static HashSet<string> Tokenize(string text)
    {
        var normalized = Regex.Replace(text.ToLowerInvariant(), @"[^\p{L}\p{Nd}]+", " ");
        return normalized
            .Split(' ', StringSplitOptions.RemoveEmptyEntries)
            .Where(w => w.Length >= 3 && !Stopwoorden.Contains(w))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
    }

    public static double BerekenLexicaleOverlap(HashSet<string> links, HashSet<string> rechts)
    {
        if (links.Count == 0 || rechts.Count == 0)
            return 0;

        var intersect = links.Intersect(rechts).Count();
        var union = links.Union(rechts).Count();
        return union == 0 ? 0 : (double)intersect / union;
    }

    public static string Inkorten(string? tekst, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(tekst))
            return string.Empty;

        var trimmed = tekst.Trim();
        if (trimmed.Length <= maxLength)
            return trimmed;

        var cut = trimmed[..maxLength];
        var lastSpace = cut.LastIndexOf(' ');
        return (lastSpace > maxLength / 2 ? cut[..lastSpace] : cut).Trim() + "…";
    }
}
