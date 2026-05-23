using LessenHub.Backend.Services.AI;
using System.Text;
using System.Text.RegularExpressions;

namespace LessenHub.Backend.Services
{
    public class LesTemplateExtractorService
    {
        private static readonly HashSet<string> MultiLineFields = new(StringComparer.Ordinal)
        {
            "Titel",
            "Introductie",
            "Inhoud",
            "Slot",
            "Leerdoelen",
            "Literatuurlijst"
        };

        private static readonly Dictionary<string, string> LabelToField = new(StringComparer.Ordinal)
        {
            ["lessenserie"] = "LessenSerieTitel",
            ["serie"] = "LessenSerieTitel",
            ["lessenserietitel"] = "LessenSerieTitel",

            ["titel"] = "Titel",
            ["titelvanles"] = "Titel",
            ["titelvandelles"] = "Titel",
            ["ondertitel"] = "Titel",
            ["onderwerp"] = "Titel",
            ["lestitel"] = "Titel",

            ["doelgroep"] = "Doelgroep",

            ["omschrijving"] = "Introductie",
            ["introductie"] = "Introductie",
            ["inleiding"] = "Introductie",
            ["start"] = "Introductie",
            ["doelvandales"] = "Introductie",
            ["doelvandels"] = "Introductie",

            ["inhoud"] = "Inhoud",
            ["lesopzet"] = "Inhoud",
            ["inhoudvandelles"] = "Inhoud",
            ["inhoudvandeles"] = "Inhoud",
            ["kern"] = "Inhoud",
            ["lesinhoud"] = "Inhoud",
            ["activiteit"] = "Inhoud",
            ["werkvorm"] = "Inhoud",
            ["verwerking"] = "Inhoud",

            ["slot"] = "Slot",
            ["slotvandelles"] = "Slot",
            ["slotvandeles"] = "Slot",
            ["afsluiting"] = "Slot",
            ["afsluitingenreflectie"] = "Slot",
            ["conclusie"] = "Slot",
            ["reflectie"] = "Slot",
            ["nabespreking"] = "Slot",

            ["bronnen"] = "Literatuurlijst",
            ["bron"] = "Literatuurlijst",
            ["literatuur"] = "Literatuurlijst",
            ["literatuurlijst"] = "Literatuurlijst",
            ["referenties"] = "Literatuurlijst",
            ["bronvermelding"] = "Literatuurlijst",

            ["leerdoel"] = "Leerdoelen",
            ["leerdoelen"] = "Leerdoelen",

            ["schoolniveau"] = "SchoolNiveau",
            ["schoolniveauofniveau"] = "SchoolNiveau",
            ["niveau"] = "SchoolNiveau",

            ["taalniveau"] = "TaalNiveau",
            ["cefr"] = "TaalNiveau",

            ["leerjaar"] = "Leerjaar",
            ["jaarlaag"] = "Leerjaar",
            ["klas"] = "Leerjaar",

            ["tijdsduur"] = "TijdsDuurMinuten",
            ["duur"] = "TijdsDuurMinuten",
            ["lesduur"] = "TijdsDuurMinuten"
        };

        private static readonly Dictionary<string, int> LeerdoelNameMap = new(StringComparer.Ordinal)
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
            ["probleemoplossing"] = 9
        };

        private static readonly Dictionary<string, int> SchoolNiveauMap = new(StringComparer.Ordinal)
        {
            ["vmbo"] = 0,
            ["havo"] = 1,
            ["vwo"] = 2,
            ["mbo"] = 3,
            ["hbo"] = 4,
            ["wo"] = 5
        };

        private static readonly Dictionary<string, int> TaalNiveauMap = new(StringComparer.Ordinal)
        {
            ["a1"] = 0,
            ["a2"] = 1,
            ["b1"] = 2,
            ["b2"] = 3,
            ["c1"] = 4,
            ["c2"] = 5
        };

        private static readonly Dictionary<string, int> LeerjaarMap = new(StringComparer.Ordinal)
        {
            ["eerste"] = 0,
            ["tweede"] = 1,
            ["derde"] = 2,
            ["vierde"] = 3,
            ["vijfde"] = 4,
            ["zesde"] = 5
        };

        private static readonly string[] InvalidTitleStarters =
        [
            "vervolgens",
            "daarna",
            "nadat",
            "wanneer"
        ];

        /// <summary>Herken veldnaam uit platte tekst (kop, tabelcel, kolom links).</summary>
        public static bool TryResolveFieldLabel(string labelText, out string field)
        {
            field = string.Empty;
            if (string.IsNullOrWhiteSpace(labelText))
            {
                return false;
            }

            var trimmed = Regex.Replace(labelText.Trim().TrimEnd(':'), @"^\s*\d+[\).\-]\s*", string.Empty);
            trimmed = Regex.Replace(trimmed, @"\s*\(\s*\d+[^)]*minuten?\s*\)\s*$", string.Empty, RegexOptions.IgnoreCase).Trim();
            var key = NormalizeToken(trimmed);
            if (key.Length == 0)
            {
                return false;
            }

            return LabelToField.TryGetValue(key, out field);
        }

        public LesAnalyseResultaat Extract(string text)
        {
            if (string.IsNullOrWhiteSpace(text))
            {
                return new LesAnalyseResultaat();
            }

            var prepared = LesDocumentTextPrep.InjectLineBreaksBeforeLabels(text);
            var result = ExtractFromLines(prepared);

            if (IsCoreContentWeak(result))
            {
                result = MergeExtractResults(result, ExtractNarrativeFallback(prepared));
            }

            var inlineBronnen = ExtractInlineBronnen(prepared);
            if (inlineBronnen.Count > 0)
            {
                result.Literatuurlijst = (result.Literatuurlijst ?? [])
                    .Concat(inlineBronnen)
                    .Where(s => !string.IsNullOrWhiteSpace(s))
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .ToList();
            }

            return result;
        }

        private static bool IsCoreContentWeak(LesAnalyseResultaat result)
        {
            var kernCount = new[] { result.Titel, result.Introductie, result.Inhoud, result.Slot }
                .Count(s => !string.IsNullOrWhiteSpace(s));
            return kernCount < 2;
        }

        private static LesAnalyseResultaat MergeExtractResults(LesAnalyseResultaat primary, LesAnalyseResultaat fallback)
        {
            return new LesAnalyseResultaat
            {
                LessenSerieTitel = CoalesceNonEmpty(primary.LessenSerieTitel, fallback.LessenSerieTitel),
                Titel = CoalesceNonEmpty(primary.Titel, fallback.Titel),
                Introductie = CoalesceNonEmpty(primary.Introductie, fallback.Introductie),
                Inhoud = CoalesceNonEmpty(primary.Inhoud, fallback.Inhoud),
                Slot = CoalesceNonEmpty(primary.Slot, fallback.Slot),
                Leerdoelen = primary.Leerdoelen.Count > 0 ? primary.Leerdoelen : fallback.Leerdoelen,
                SchoolNiveau = primary.SchoolNiveau ?? fallback.SchoolNiveau,
                TaalNiveau = primary.TaalNiveau ?? fallback.TaalNiveau,
                Leerjaar = primary.Leerjaar ?? fallback.Leerjaar,
                TijdsDuurMinuten = primary.TijdsDuurMinuten ?? fallback.TijdsDuurMinuten,
                Literatuurlijst = (primary.Literatuurlijst ?? [])
                    .Concat(fallback.Literatuurlijst ?? [])
                    .Where(s => !string.IsNullOrWhiteSpace(s))
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .ToList(),
            };
        }

        private LesAnalyseResultaat ExtractNarrativeFallback(string text)
        {
            var lines = text.Replace("\r\n", "\n").Replace('\r', '\n')
                .Split('\n')
                .Select(l => StripListMarker(l.Trim()))
                .Where(l => l.Length > 0)
                .ToList();

            if (lines.Count == 0)
            {
                return new LesAnalyseResultaat();
            }

            string? titel = null;
            var intro = new StringBuilder();
            var inhoud = new StringBuilder();
            var slot = new StringBuilder();
            var leerdoelenRaw = new StringBuilder();
            var literatuur = new List<string>();
            string? duurRaw = null;
            string? niveauRaw = null;
            string? leerjaarRaw = null;

            var section = string.Empty;
            var titleCaptured = false;

            foreach (var line in lines)
            {
                if (TryGetFieldFromKeyValue(line, out var kvField, out var kvValue))
                {
                    ApplyScalarFallback(kvField, kvValue, ref duurRaw, ref niveauRaw, ref leerjaarRaw, ref leerdoelenRaw);
                    section = kvField;
                    if (kvField == "Titel" && !string.IsNullOrWhiteSpace(kvValue))
                    {
                        titel = kvValue.Trim();
                        titleCaptured = true;
                    }
                    continue;
                }

                if (TryParseLabelLine(line, out var labelField, out var inlineValue))
                {
                    section = labelField;
                    if (labelField == "Titel" && !string.IsNullOrWhiteSpace(inlineValue))
                    {
                        titel = inlineValue.Trim();
                        titleCaptured = true;
                    }
                    else if (!string.IsNullOrWhiteSpace(inlineValue))
                    {
                        AppendToSection(intro, inhoud, slot, leerdoelenRaw, labelField, inlineValue);
                    }
                    continue;
                }

                if (!titleCaptured && titel is null && IsLikelyTitleLine(line))
                {
                    titel = line;
                    titleCaptured = true;
                    section = string.Empty;
                    continue;
                }

                if (TryMapNarrativeHeading(line, out var mapped))
                {
                    section = mapped;
                    continue;
                }

                if (Regex.IsMatch(line, @"\b(leerdoelen|schoolniveau|niveau|taalniveau|leerjaar|tijdsduur|duur)\s*:", RegexOptions.IgnoreCase))
                {
                    if (TryGetFieldFromKeyValue(line, out var metaField, out var metaValue))
                    {
                        ApplyScalarFallback(metaField, metaValue, ref duurRaw, ref niveauRaw, ref leerjaarRaw, ref leerdoelenRaw);
                    }
                    continue;
                }

                if (section == "Literatuurlijst" || IsLikelyBibliographyLine(line))
                {
                    literatuur.Add(line.TrimStart('-', '•', '*', ' ').Trim());
                    continue;
                }

                AppendToSection(intro, inhoud, slot, leerdoelenRaw, section, line);
            }

            return new LesAnalyseResultaat
            {
                Titel = NormalizeLayout(titel ?? string.Empty),
                Introductie = NormalizeLayout(intro.ToString()),
                Inhoud = NormalizeLayout(inhoud.ToString()),
                Slot = NormalizeLayout(slot.ToString()),
                Leerdoelen = ParseLeerdoelen(leerdoelenRaw.ToString()),
                SchoolNiveau = ParseEnumValue(niveauRaw ?? string.Empty, SchoolNiveauMap, 0, 5),
                TaalNiveau = ParseEnumValue(string.Empty, TaalNiveauMap, 0, 5),
                Leerjaar = ParseEnumValue(leerjaarRaw ?? string.Empty, LeerjaarMap, 0, 5),
                TijdsDuurMinuten = ParseDurationMinutes(duurRaw ?? string.Empty),
                Literatuurlijst = literatuur.Select(NormalizeLayout).Where(s => s.Length > 0).Distinct(StringComparer.OrdinalIgnoreCase).ToList(),
            };
        }

        private static void ApplyScalarFallback(
            string field,
            string value,
            ref string? duurRaw,
            ref string? niveauRaw,
            ref string? leerjaarRaw,
            ref StringBuilder leerdoelenRaw)
        {
            switch (field)
            {
                case "TijdsDuurMinuten":
                    duurRaw = value;
                    break;
                case "SchoolNiveau":
                    niveauRaw = value;
                    break;
                case "Leerjaar":
                    leerjaarRaw = value;
                    break;
                case "Leerdoelen":
                    leerdoelenRaw.AppendLine(value);
                    break;
            }
        }

        private static void AppendToSection(
            StringBuilder intro,
            StringBuilder inhoud,
            StringBuilder slot,
            StringBuilder leerdoelenRaw,
            string section,
            string line)
        {
            if (string.IsNullOrWhiteSpace(line))
            {
                return;
            }

            var target = section switch
            {
                "Introductie" => intro,
                "Inhoud" => inhoud,
                "Slot" => slot,
                "Leerdoelen" => leerdoelenRaw,
                _ => null,
            };

            if (target is null)
            {
                return;
            }

            if (target.Length > 0)
            {
                target.AppendLine();
            }

            target.Append(line.Trim());
        }

        private static bool TryMapNarrativeHeading(string line, out string mappedSection)
        {
            mappedSection = string.Empty;
            var cleaned = Regex.Replace(line.Trim().TrimEnd(':'), @"^\s*\d+[\).\-]\s*", string.Empty);
            var normalized = NormalizeToken(cleaned);

            if (normalized.StartsWith("introductie", StringComparison.Ordinal)
                || normalized.StartsWith("inleiding", StringComparison.Ordinal)
                || normalized.StartsWith("start", StringComparison.Ordinal)
                || normalized.StartsWith("doelvandales", StringComparison.Ordinal)
                || normalized.StartsWith("doelvandels", StringComparison.Ordinal))
            {
                mappedSection = "Introductie";
                return true;
            }

            if (normalized.StartsWith("inhoud", StringComparison.Ordinal)
                || normalized.StartsWith("kern", StringComparison.Ordinal)
                || normalized.StartsWith("lesopzet", StringComparison.Ordinal)
                || normalized.StartsWith("lesinhoud", StringComparison.Ordinal))
            {
                mappedSection = "Inhoud";
                return true;
            }

            if (normalized.StartsWith("slot", StringComparison.Ordinal)
                || normalized.StartsWith("afsluiting", StringComparison.Ordinal)
                || normalized.StartsWith("reflectie", StringComparison.Ordinal)
                || normalized.StartsWith("afsluitingenreflectie", StringComparison.Ordinal))
            {
                mappedSection = "Slot";
                return true;
            }

            if (normalized is "bronnen" or "literatuur" or "literatuurlijst")
            {
                mappedSection = "Literatuurlijst";
                return true;
            }

            return false;
        }

        private static bool IsLikelyTitleLine(string line)
        {
            if (line.Length < 8 || line.Length > 120)
            {
                return false;
            }

            if (line.Contains(':', StringComparison.Ordinal))
            {
                return false;
            }

            var normalized = NormalizeToken(line);
            if (LabelToField.ContainsKey(normalized))
            {
                return false;
            }

            if (InvalidTitleStarters.Any(s => normalized.StartsWith(s, StringComparison.Ordinal)))
            {
                return false;
            }

            return !Regex.IsMatch(line, @"\b(introductie|inhoud|slot|leerdoelen|tijdsduur|lessenserie)\b", RegexOptions.IgnoreCase);
        }

        private LesAnalyseResultaat ExtractFromLines(string text)
        {
            var lines = LesDocumentTextPrep.ExpandTableAndColumnRows(
                text.Replace("\r\n", "\n").Replace('\r', '\n').Split('\n'));
            var sections = new Dictionary<string, StringBuilder>(StringComparer.Ordinal);
            var scalarValues = new Dictionary<string, string>(StringComparer.Ordinal);
            var currentField = string.Empty;

            foreach (var raw in lines)
            {
                var line = StripListMarker(raw);
                if (line.Length == 0)
                {
                    if (currentField.Length > 0 && MultiLineFields.Contains(currentField))
                    {
                        sections.TryAdd(currentField, new StringBuilder());
                        sections[currentField].AppendLine();
                    }
                    continue;
                }

                if (TryGetFieldFromKeyValue(line, out var kvField, out var kvValue))
                {
                    if (MultiLineFields.Contains(kvField))
                    {
                        sections[kvField] = new StringBuilder(kvValue.Trim());
                        currentField = kvField;
                    }
                    else
                    {
                        scalarValues[kvField] = kvValue.Trim();
                        currentField = string.Empty;
                    }
                    continue;
                }

                if (TryParseTableRow(line, out var tableField, out var tableValue))
                {
                    if (MultiLineFields.Contains(tableField))
                    {
                        sections[tableField] = new StringBuilder(tableValue.Trim());
                        currentField = tableField;
                    }
                    else
                    {
                        scalarValues[tableField] = tableValue.Trim();
                        currentField = string.Empty;
                    }
                    continue;
                }

                if (TryParseLabelLine(line, out var labelField, out var inlineValue))
                {
                    if (!string.IsNullOrWhiteSpace(inlineValue))
                    {
                        if (MultiLineFields.Contains(labelField))
                            sections[labelField] = new StringBuilder(inlineValue.Trim());
                        else
                            scalarValues[labelField] = inlineValue.Trim();
                        currentField = labelField;
                    }
                    else
                    {
                        currentField = labelField;
                        if (MultiLineFields.Contains(labelField))
                            sections.TryAdd(labelField, new StringBuilder());
                    }
                    continue;
                }

                if (currentField.Length > 0 && MultiLineFields.Contains(currentField))
                {
                    sections.TryAdd(currentField, new StringBuilder());
                    if (sections[currentField].Length > 0)
                    {
                        sections[currentField].AppendLine();
                    }
                    sections[currentField].Append(line);
                }
            }

            var doelgroep = GetSectionOrScalar(sections, scalarValues, "Doelgroep");

            var result = new LesAnalyseResultaat
            {
                LessenSerieTitel = NormalizeLayout(FirstNonEmpty(GetSectionOrScalar(sections, scalarValues, "LessenSerieTitel"))),
                Titel = NormalizeLayout(FirstNonEmpty(GetSectionOrScalar(sections, scalarValues, "Titel"))),
                Introductie = NormalizeLayout(FirstNonEmpty(GetSectionOrScalar(sections, scalarValues, "Introductie"))),
                Inhoud = NormalizeLayout(FirstNonEmpty(GetSectionOrScalar(sections, scalarValues, "Inhoud"))),
                Slot = NormalizeLayout(FirstNonEmpty(GetSectionOrScalar(sections, scalarValues, "Slot"))),
                Leerdoelen = ParseLeerdoelen(GetSectionOrScalar(sections, scalarValues, "Leerdoelen")),
                SchoolNiveau = ParseEnumValue(GetSectionOrScalar(sections, scalarValues, "SchoolNiveau"), SchoolNiveauMap, 0, 5)
                    ?? ParseSchoolNiveauFromDoelgroep(doelgroep),
                TaalNiveau = ParseEnumValue(GetSectionOrScalar(sections, scalarValues, "TaalNiveau"), TaalNiveauMap, 0, 5),
                Leerjaar = ParseEnumValue(GetSectionOrScalar(sections, scalarValues, "Leerjaar"), LeerjaarMap, 0, 5),
                TijdsDuurMinuten = ParseDurationMinutes(GetSectionOrScalar(sections, scalarValues, "TijdsDuurMinuten")),
                Literatuurlijst = ParseLiteratuurlijst(GetSectionOrScalar(sections, scalarValues, "Literatuurlijst"))
            };

            return result;
        }

        private static string GetSectionOrScalar(
            Dictionary<string, StringBuilder> sections,
            Dictionary<string, string> scalars,
            string field)
        {
            if (sections.TryGetValue(field, out var sectionText))
            {
                return sectionText.ToString();
            }

            if (scalars.TryGetValue(field, out var value))
            {
                return value;
            }

            return string.Empty;
        }

        private static bool TryParseTableRow(string line, out string field, out string value)
        {
            field = string.Empty;
            value = string.Empty;

            var parts = line.Split('\t', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            if (parts.Length < 2)
            {
                return false;
            }

            if (!TryResolveFieldLabel(parts[0], out field))
            {
                return false;
            }

            value = string.Join(" ", parts.Skip(1));
            return value.Length > 0;
        }

        private static bool TryGetFieldFromKeyValue(string line, out string field, out string value)
        {
            field = string.Empty;
            value = string.Empty;

            var idx = line.IndexOf(':');
            if (idx <= 0)
            {
                return false;
            }

            var key = NormalizeToken(line[..idx]);
            if (!LabelToField.TryGetValue(key, out var mappedField))
            {
                return false;
            }

            field = mappedField;
            value = line[(idx + 1)..].Trim();
            return true;
        }

        private static bool TryParseLabelLine(string line, out string field, out string? inlineValue)
        {
            field = string.Empty;
            inlineValue = null;

            var trimmed = StripDurationSuffix(line.Trim().TrimEnd(':'));
            if (trimmed.Length == 0)
            {
                return false;
            }

            var normalizedHeading = NormalizeToken(trimmed);

            if (TryResolveFieldLabel(trimmed, out field))
            {
                return true;
            }

            foreach (var kvp in LabelToField.OrderByDescending(k => k.Key.Length))
            {
                var labelPattern = Regex.Escape(kvp.Key);
                var withValue = Regex.Match(
                    trimmed,
                    $@"^(?:\s*\d+[\).\-]\s*)?{labelPattern}\s*(?::|\s+)\s*(.+)$",
                    RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);

                if (withValue.Success)
                {
                    field = kvp.Value;
                    inlineValue = withValue.Groups[1].Value.Trim();
                    return true;
                }
            }

            return false;
        }

        private static string StripListMarker(string line)
        {
            return Regex.Replace(line.Trim(), @"^[\s•\*\-–—]+", string.Empty).Trim();
        }

        private static string StripDurationSuffix(string line)
        {
            return Regex.Replace(line, @"\s*\(\s*\d+[^)]*minuten?\s*\)\s*$", string.Empty, RegexOptions.IgnoreCase)
                .Trim();
        }

        private static int? ParseSchoolNiveauFromDoelgroep(string raw)
        {
            if (string.IsNullOrWhiteSpace(raw))
            {
                return null;
            }

            var normalized = NormalizeToken(raw);
            if (normalized.Contains("mbo", StringComparison.Ordinal))
            {
                return 3;
            }

            if (normalized.Contains("vwo", StringComparison.Ordinal))
            {
                return 2;
            }

            if (normalized.Contains("havo", StringComparison.Ordinal))
            {
                return 1;
            }

            if (normalized.Contains("vmbo", StringComparison.Ordinal))
            {
                return 0;
            }

            return null;
        }

        private static bool IsLikelyMetadataLine(string value)
        {
            var normalized = NormalizeToken(value);

            if (normalized.Length == 0)
            {
                return true;
            }

            if (LabelToField.Keys.Any(k => normalized.StartsWith(k, StringComparison.Ordinal)))
            {
                return true;
            }

            if (Regex.IsMatch(value, @"\b(vmbo|havo|vwo|mbo|hbo|wo|a1|a2|b1|b2|c1|c2|leerjaar|jaarlaag|duur|minuten)\b", RegexOptions.IgnoreCase))
            {
                return value.Length < 80;
            }

            return false;
        }

        private static bool IsLikelyBibliographyLine(string value)
        {
            if (Regex.IsMatch(value, @"https?://", RegexOptions.IgnoreCase))
            {
                return true;
            }

            if (Regex.IsMatch(value, @"\([^()\n]{5,120}\d{4}[a-z]?\)", RegexOptions.IgnoreCase))
            {
                return true;
            }

            return Regex.IsMatch(value, @"\b(bron|bronnen|literatuur|referentie|bibliografie)\b", RegexOptions.IgnoreCase);
        }

        private static bool IsLikelyClosingParagraph(string value)
        {
            return Regex.IsMatch(value, @"\b(slot|afsluiting|afronding|evaluatie|reflectie|terugblik|nabespreking)\b", RegexOptions.IgnoreCase);
        }

        private static List<int> MergeDistinct(List<int> primary, List<int> fallback)
        {
            return primary
                .Concat(fallback)
                .Where(n => n is >= 0 and <= 9)
                .Distinct()
                .OrderBy(n => n)
                .ToList();
        }

        private static string FirstNonEmpty(string value)
        {
            var cleaned = value?.Trim();
            return string.IsNullOrWhiteSpace(cleaned) ? string.Empty : cleaned;
        }

        private static string? CoalesceNonEmpty(string? primary, string? fallback)
        {
            if (!string.IsNullOrWhiteSpace(primary))
            {
                return primary.Trim();
            }

            if (!string.IsNullOrWhiteSpace(fallback))
            {
                return fallback.Trim();
            }

            return null;
        }

        private static string NormalizeToken(string value)
        {
            var sb = new StringBuilder(value.Length);
            foreach (var c in value.ToLowerInvariant())
            {
                if (char.IsLetterOrDigit(c))
                {
                    sb.Append(c);
                }
            }
            return sb.ToString();
        }

        private static List<int> ParseLeerdoelen(string raw)
        {
            if (string.IsNullOrWhiteSpace(raw))
            {
                return [];
            }

            var goals = new HashSet<int>();

            foreach (Match m in Regex.Matches(raw, @"\b\d+\b"))
            {
                if (int.TryParse(m.Value, out var n) && n >= 0 && n <= 9)
                {
                    goals.Add(n);
                }
            }

            foreach (var line in raw.Replace("\r\n", "\n").Split('\n', StringSplitOptions.RemoveEmptyEntries))
            {
                var normalized = NormalizeToken(StripListMarker(line));
                if (normalized.Length == 0)
                {
                    continue;
                }

                foreach (var kvp in LeerdoelNameMap)
                {
                    if (normalized.Contains(kvp.Key, StringComparison.Ordinal))
                    {
                        goals.Add(kvp.Value);
                    }
                }
            }

            var full = NormalizeToken(raw);
            foreach (var kvp in LeerdoelNameMap)
            {
                if (full.Contains(kvp.Key, StringComparison.Ordinal))
                {
                    goals.Add(kvp.Value);
                }
            }

            return goals.OrderBy(g => g).ToList();
        }

        private static int? ParseEnumValue(string raw, Dictionary<string, int> map, int min, int max)
        {
            if (string.IsNullOrWhiteSpace(raw))
            {
                return null;
            }

            if (int.TryParse(raw.Trim(), out var numeric) && numeric >= min && numeric <= max)
            {
                return numeric;
            }

            var normalized = NormalizeToken(raw);
            foreach (var kvp in map)
            {
                if (normalized.Contains(kvp.Key, StringComparison.Ordinal))
                {
                    return kvp.Value;
                }
            }

            return null;
        }

        private static int? ParseDurationMinutes(string raw)
        {
            if (string.IsNullOrWhiteSpace(raw))
            {
                return null;
            }

            var trimmed = raw.Trim();

            if (int.TryParse(trimmed, out var directMinutes) && directMinutes > 0)
            {
                return directMinutes;
            }

            var hhmm = Regex.Match(trimmed, @"(?<h>\d{1,2})[:.](?<m>\d{1,2})");
            if (hhmm.Success
                && int.TryParse(hhmm.Groups["h"].Value, out var h)
                && int.TryParse(hhmm.Groups["m"].Value, out var m)
                && h >= 0 && m >= 0 && m < 60)
            {
                return (h * 60) + m;
            }

            var hours = 0;
            var minutes = 0;

            var hourMatch = Regex.Match(trimmed.ToLowerInvariant(), @"(?<h>\d+)\s*uur");
            if (hourMatch.Success)
            {
                int.TryParse(hourMatch.Groups["h"].Value, out hours);
            }

            var minuteMatch = Regex.Match(trimmed.ToLowerInvariant(), @"(?<m>\d+)\s*(min|minuut|minuten)");
            if (minuteMatch.Success)
            {
                int.TryParse(minuteMatch.Groups["m"].Value, out minutes);
            }

            var total = (hours * 60) + minutes;
            return total > 0 ? total : null;
        }

        private static List<string> ParseLiteratuurlijst(string raw)
        {
            if (string.IsNullOrWhiteSpace(raw))
            {
                return [];
            }

            var split = raw
                .Replace("\r\n", "\n")
                .Replace('\r', '\n')
                .Split('\n', StringSplitOptions.RemoveEmptyEntries)
                .Select(s => s.Trim())
                .Where(s => s.Length > 0)
                .Select(s => s.TrimStart('-', '•', '*').Trim())
                .Where(s => s.Length > 0)
                .Select(NormalizeLayout)
                .Where(s => s.Length > 0)
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            if (split.Count > 0)
            {
                return split;
            }

            var compact = NormalizeLayout(raw);
            return compact.Length > 0 ? [compact] : [];
        }

        private static string NormalizeLayout(string input)
        {
            if (string.IsNullOrWhiteSpace(input))
            {
                return string.Empty;
            }

            var normalized = input.Replace("\r\n", "\n").Replace('\r', '\n');

            // Herstel PDF-paginanummers tussen afgebroken woorden
            // Voorbeeld: "tekstbe-\n3. \ngrip" -> "tekstbegrip"
            normalized = Regex.Replace(normalized,
                @"(\p{L}+)-\s*\d+\.\s+(\p{L}+)",
                "$1$2");

            // Herstel ook zonder koppelteken maar met paginanummer
            // Voorbeeld: "tekst-\n3. grip" -> "tekstgrip"
            normalized = Regex.Replace(normalized,
                @"(\p{L}+)-\s*\n\s*\d+[.)]\s*\n?\s*(\p{L}+)",
                "$1$2");

            // Re-join hyphenated line breaks from PDFs/OCR: "leer-\nlingen" -> "leerlingen".
            normalized = Regex.Replace(normalized, @"(?<a>\p{L})-\s*\n\s*(?<b>\p{L})", "${a}${b}");

            // Normalize multiple spaces/tabs but preserve intentional paragraph breaks
            normalized = Regex.Replace(normalized, @"[ \t]+", " ");
            normalized = Regex.Replace(normalized, @"\s+([,.;:!?])", "$1");
            normalized = Regex.Replace(normalized, @"([,.;:!?])(\S)", "$1 $2");
            
            // Preserve paragraph breaks: only collapse 4+ newlines to 2, keep 2-3 newlines
            normalized = Regex.Replace(normalized, @"\n{4,}", "\n\n");

            // Remove short OCR hyphen artifacts inside words: "za-ak" -> "zaak".
            normalized = Regex.Replace(normalized, @"\b(\p{L}{1,3})-(\p{L}{1,3})\b", "$1$2");
            normalized = Regex.Replace(normalized, @"\b(\p{Ll}{3,})-(\p{Ll}{3,})\b", "$1$2");

            var lines = normalized
                .Split('\n')
                .Select(l => l.Trim())
                .ToArray();

            return string.Join("\n", lines).Trim();
        }

        private static List<string> ExtractInlineBronnen(string rawText)
        {
            if (string.IsNullOrWhiteSpace(rawText))
            {
                return [];
            }

            var bronnen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            // Strategy 1: Find all complete URLs (standalone or at end of lines)
            var urlRegex = @"https?://[^\s\[\]{}]+";
            foreach (Match m in Regex.Matches(rawText, urlRegex, RegexOptions.IgnoreCase))
            {
                var url = m.Value.Trim();
                
                // Remove trailing punctuation
                while (url.Length > 0 && ",.;:!?)'\"[]{}".Contains(url[url.Length - 1]))
                {
                    url = url.Substring(0, url.Length - 1);
                }
                
                // Only add if it's a valid URL
                if (url.Length > 8 && url.Contains(".") && url.Contains("/"))
                {
                    bronnen.Add(url);
                }
            }

            // Strategy 2: Extract academic citations (Author, Year)
            var citationRegex = @"\((?<cite>[^()\n]{5,150}?\d{4}[a-z]?)\)";
            foreach (Match m in Regex.Matches(rawText, citationRegex))
            {
                var citation = m.Groups["cite"].Value.Trim();
                if (citation.Length > 5 && !citation.StartsWith("http", StringComparison.OrdinalIgnoreCase))
                {
                    bronnen.Add(citation);
                }
            }

            // Strategy 3: Extract typed/numbered literature entries
            var lines = rawText.Split(new[] { "\r\n", "\n" }, StringSplitOptions.None);
            foreach (var line in lines)
            {
                var trimmed = line.Trim();
                
                // Look for lines starting with number, dash, or bullet
                var match = Regex.Match(trimmed, @"^(?:[-•*]|(\d+)[.:\)])\s+(.+)$");
                if (match.Success)
                {
                    var entry = match.Groups[2].Value.Trim();
                    
                    // Skip if it's just a URL (already handled above)
                    if (!entry.StartsWith("http", StringComparison.OrdinalIgnoreCase) && entry.Length > 3)
                    {
                        if (!bronnen.Any(b => b.Equals(entry, StringComparison.OrdinalIgnoreCase)))
                        {
                            bronnen.Add(entry);
                        }
                    }
                }
            }

            return bronnen.OrderBy(b => b).ToList();
        }
    }
}
