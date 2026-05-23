using LessenHub.Application.Abstractions;
using LessenHub.Application.Dtos;
using LessenHub.Application.Services;
using LessenHub.Backend.Services;
using LessenHub.Backend.Services.AI;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LessenHub.Backend.Controllers
{
    [ApiController]
    [Route("[controller]")]
    [Authorize]
    public class LesAnalyseController(
        IAiService aiService,
        DocumentExtractorService documentExtractor,
        LesTemplateExtractorService templateExtractor,
        LesLabelSectionExtractor labelSectionExtractor,
        LesSemanticExtractorService semanticExtractor,
        IPrivacyRedactionService privacyRedaction,
        LesDuplicaatDetectieService duplicaatDetectieService,
        AiAnalyseTraceHolder aiTraceHolder,
        IHostEnvironment hostEnvironment,
        ILogger<LesAnalyseController> logger) : ControllerBase
    {
        [HttpPost("controleer-duplicaat", Name = "ControleerLesDuplicaat")]
        public async Task<ActionResult<LesDuplicaatControleResponse>> ControleerDuplicaat(
            [FromBody] LesDuplicaatControleRequest request,
            CancellationToken cancellationToken)
        {
            try
            {
                if (request == null || string.IsNullOrWhiteSpace(request.Titel))
                    return BadRequest("Titel is verplicht voor duplicaatcontrole.");

                var resultaat = await duplicaatDetectieService.ControleerAsync(request, cancellationToken);
                return Ok(resultaat);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Fout bij duplicaatcontrole");
                var detail = ex is AggregateException agg && agg.InnerExceptions.Count > 0
                    ? agg.InnerExceptions[0].Message
                    : ex.Message;
                return StatusCode(503, $"Duplicaatcontrole tijdelijk niet beschikbaar: {detail}");
            }
        }

        [HttpPost("analyseer", Name = "AnalyseerLesDocument")]
        [Consumes("multipart/form-data")]
        public async Task<ActionResult<LesAnalyseDocumentResponse>> Analyseer([FromForm] IFormFile bestand)
        {
            try
            {
                if (bestand == null || bestand.Length == 0)
                    return BadRequest("Geen bestand meegegeven.");

                var extension = DocumentExtractorService.ResolveExtension(bestand);
                if (extension != ".pdf" && extension != ".docx")
                    return BadRequest("Alleen PDF en Word (.docx) bestanden zijn toegestaan.");

                if (bestand.Length > 10 * 1024 * 1024)
                    return BadRequest("Bestand is te groot (max 10 MB).");

                logger.LogInformation(
                    "Analyseren document: {Bestandsnaam}, extensie {Extensie}, MIME {Mime}",
                    bestand.FileName,
                    extension,
                    bestand.ContentType ?? "(geen)");

                var tekst = await documentExtractor.ExtractTekst(bestand);

                logger.LogInformation("documentText.length: {Length}", tekst?.Length ?? 0);
                var docPreview = tekst is { Length: > 0 }
                    ? (tekst.Length > 1000 ? tekst[..1000] : tekst)
                    : string.Empty;
                logger.LogInformation("documentText preview (eerste 1000): {Preview}", docPreview);

                if (string.IsNullOrWhiteSpace(tekst))
                {
                    return extension == ".pdf"
                        ? BadRequest("We konden geen tekst uit deze PDF halen.")
                        : BadRequest("Kon geen tekst uit het document halen.");
                }

                // Privacy first: redact PII before any extraction or external API call
                var redactedTekst = privacyRedaction.RedactForAi(tekst);
                logger.LogInformation("Privacy redactie toegepast: {Length} characters", redactedTekst.Length);

                var labelExtract = labelSectionExtractor.Extract(redactedTekst);
                var templateExtract = templateExtractor.Extract(redactedTekst);
                // Label-extractie heeft voorrang; template vult alleen lege velden.
                var deterministic = MergeLabelFirst(labelExtract, templateExtract);

                logger.LogInformation(
                    "Label/template extraction - Serie: {Serie}, Titel: {Titel}, Intro len: {IntroLen}, Inhoud len: {InhoudLen}",
                    deterministic.LessenSerieTitel ?? "(leeg)",
                    deterministic.Titel ?? "(leeg)",
                    deterministic.Introductie?.Length ?? 0,
                    deterministic.Inhoud?.Length ?? 0);

                var truncatedRedactedTekst = redactedTekst.Length > 28000 ? redactedTekst[..28000] : redactedTekst;
                logger.LogInformation("Text to AI (redacted & truncated): {Length} characters", truncatedRedactedTekst.Length);

                LesAnalyseResultaat aiResultaat = new();
                var aiCallFailed = false;
                aiTraceHolder.Reset();
                try
                {
                    logger.LogInformation("AI-call wordt aangeroepen");
                    aiResultaat = await aiService.AnalyseerLesDocument(truncatedRedactedTekst);
                    logger.LogInformation(
                        "Parsed lesson data - Titel: {Titel}, Intro: {IntroLen}, Inhoud: {InhoudLen}, Slot: {SlotLen}",
                        aiResultaat.Titel ?? "(leeg)",
                        aiResultaat.Introductie?.Length ?? 0,
                        aiResultaat.Inhoud?.Length ?? 0,
                        aiResultaat.Slot?.Length ?? 0);
                }
                catch (Exception ex)
                {
                    aiCallFailed = true;
                    logger.LogWarning(ex, "AI-call mislukt, ga verder met label/template-extractie");
                    aiResultaat = new LesAnalyseResultaat();
                }

                var resultaat = MergeResultaten(aiResultaat, deterministic);
                resultaat = semanticExtractor.FillGaps(resultaat, redactedTekst);
                resultaat = LesAnalysePipeline.ApplyFinalFallbacks(resultaat, redactedTekst);
                resultaat = LesAnalyseJsonParser.Normalize(resultaat);
                resultaat = Sanitize(resultaat);
                resultaat = LesAnalysePostProcessor.Opschonen(resultaat);

                var validation = LesAnalysePipeline.DescribeValidation(resultaat);
                logger.LogInformation("Validation result: {Validation}", validation);

                if (!LesAnalysePipeline.HasUsableData(resultaat))
                {
                    logger.LogWarning(
                        "Geen bruikbare data na extractie (AI mislukt: {AiFailed}, validatie: {Validation})",
                        aiCallFailed,
                        validation);
                    return BadRequest(
                        "Kon geen lesgegevens uit het document halen. Probeer een ander bestand of vul de velden handmatig in.");
                }

                var debug = hostEnvironment.IsDevelopment()
                    ? new LesAnalysePipelineDebug
                    {
                        DocumentTextLength = tekst.Length,
                        DocumentTextPreview = docPreview,
                        AiCallAttempted = aiTraceHolder.LastCallAttempted,
                        AiCallSucceeded = aiTraceHolder.LastCallSucceeded && !aiCallFailed,
                        AiRawResponsePreview = aiTraceHolder.LastRawResponse is { Length: > 0 } raw
                            ? (raw.Length > 2000 ? raw[..2000] : raw)
                            : null,
                        ValidationResult = validation,
                    }
                    : new LesAnalysePipelineDebug
                    {
                        DocumentTextLength = tekst.Length,
                        ValidationResult = validation,
                    };

                return Ok(new LesAnalyseDocumentResponse
                {
                    Result = resultaat,
                    Debug = debug,
                });
            }
            catch (NotSupportedException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Fout bij analyseren document");
                return StatusCode(500, "Er is een fout opgetreden bij het analyseren van het document.");
            }
        }

        /// <summary>Label-extractie (PDF-koppen) wint; template vult alleen ontbrekende velden.</summary>
        private static LesAnalyseResultaat MergeLabelFirst(LesAnalyseResultaat label, LesAnalyseResultaat template)
        {
            return new LesAnalyseResultaat
            {
                LessenSerieTitel = CoalesceText(label.LessenSerieTitel, template.LessenSerieTitel),
                Titel = ChooseBestTitle(label.Titel, template.Titel),
                Introductie = CoalesceText(label.Introductie, template.Introductie)
                    ?? ChooseFullestText(label.Introductie, template.Introductie),
                Inhoud = CoalesceText(label.Inhoud, template.Inhoud)
                    ?? ChooseFullestText(label.Inhoud, template.Inhoud),
                Slot = CoalesceText(label.Slot, template.Slot)
                    ?? ChooseFullestText(label.Slot, template.Slot),
                Leerdoelen = label.Leerdoelen
                    .Concat(template.Leerdoelen)
                    .Where(n => n is >= 0 and <= 9)
                    .Distinct()
                    .OrderBy(n => n)
                    .ToList(),
                SchoolNiveau = label.SchoolNiveau ?? template.SchoolNiveau,
                TaalNiveau = label.TaalNiveau ?? template.TaalNiveau,
                Leerjaar = label.Leerjaar ?? template.Leerjaar,
                TijdsDuurMinuten = label.TijdsDuurMinuten ?? template.TijdsDuurMinuten,
                Literatuurlijst = (label.Literatuurlijst ?? [])
                    .Concat(template.Literatuurlijst ?? [])
                    .Where(s => !string.IsNullOrWhiteSpace(s))
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .ToList(),
            };
        }

        private static LesAnalyseResultaat MergeResultaten(LesAnalyseResultaat aiResult, LesAnalyseResultaat documentResult)
        {
            return new LesAnalyseResultaat
            {
                LessenSerieTitel = CoalesceText(documentResult.LessenSerieTitel, aiResult.LessenSerieTitel),
                Titel        = ChooseBestTitle(documentResult.Titel, aiResult.Titel),
                Introductie  = CoalesceText(documentResult.Introductie, aiResult.Introductie)
                    ?? ChooseFullestText(documentResult.Introductie, aiResult.Introductie),
                Inhoud       = CoalesceText(documentResult.Inhoud, aiResult.Inhoud)
                    ?? ChooseFullestText(documentResult.Inhoud, aiResult.Inhoud),
                Slot         = CoalesceText(documentResult.Slot, aiResult.Slot)
                    ?? ChooseFullestText(documentResult.Slot, aiResult.Slot),

                Leerdoelen = documentResult.Leerdoelen
                    .Concat(aiResult.Leerdoelen)
                    .Where(n => n is >= 0 and <= 9)
                    .Distinct()
                    .OrderBy(n => n)
                    .ToList(),

                SchoolNiveau     = documentResult.SchoolNiveau ?? aiResult.SchoolNiveau,
                TaalNiveau       = documentResult.TaalNiveau ?? aiResult.TaalNiveau,
                Leerjaar         = documentResult.Leerjaar ?? aiResult.Leerjaar,
                TijdsDuurMinuten = documentResult.TijdsDuurMinuten ?? aiResult.TijdsDuurMinuten,

                Literatuurlijst = (documentResult.Literatuurlijst ?? [])
                    .Concat(aiResult.Literatuurlijst ?? [])
                    .Where(s => !string.IsNullOrWhiteSpace(s))
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .ToList()
            };
        }

        // ── Titel ────────────────────────────────────────────────────────────────

        private static string? ChooseBestTitle(string? documentTitle, string? aiTitle)
        {
            var doc = TrimToNull(documentTitle);
            var ai  = TrimToNull(aiTitle);

            if (doc is null) return CleanTitle(ai);
            if (ai  is null) return CleanTitle(doc);

            if (HasTitleLabelArtifact(doc) && !HasTitleLabelArtifact(ai))
                return CleanTitle(ai);

            // Template-extractie (document) heeft voorrang — geen AI-titel als fallback bij twijfel.
            if (!IsLikelySentenceNotTitle(doc) && !ContainsForeignSectionLabel(doc) && !HasTitleLabelArtifact(doc))
                return CleanTitle(doc);

            if (!IsLikelySentenceNotTitle(ai) && !ContainsForeignSectionLabel(ai))
                return CleanTitle(ai);

            return CleanTitle(doc.Length <= ai.Length ? doc : ai);
        }

        private static bool IsLikelySentenceNotTitle(string value)
        {
            var words = value.Split(' ', StringSplitOptions.RemoveEmptyEntries);

            // Too many words for a title.
            if (words.Length > 10) return true;

            // Starts with a connective word typical of body text.
            string[] forbidden = ["vervolgens", "daarna", "nadat", "wanneer",
                                   "hierbij", "waarbij", "doordat", "zodat",
                                   "leerlingen", "de", "het", "een"];
            if (words.Length > 0 && forbidden.Contains(words[0].ToLowerInvariant())) return true;

            // Contains OCR page-break artefact like "tekstbe-3. grip".
            if (System.Text.RegularExpressions.Regex.IsMatch(
                    value,
                    @"\p{L}+-\d+\.",
                    System.Text.RegularExpressions.RegexOptions.CultureInvariant))
                return true;

            // Contains a comma mid-sentence (real titles rarely do).
            if (value.Count(c => c == ',') >= 2) return true;

            return false;
        }

        private static bool HasTitleLabelArtifact(string value) =>
            System.Text.RegularExpressions.Regex.IsMatch(
                value,
                @"(?i)^\s*(?:titel(?:\s+van\s+de\s+les)?|van\s+de\s+les|onderwerp|lestitel)\s*[:\-\.]",
                System.Text.RegularExpressions.RegexOptions.CultureInvariant);

        private static bool ContainsForeignSectionLabel(string value)
        {
            return System.Text.RegularExpressions.Regex.IsMatch(
                value,
                @"(?i)\b(leerdoelen|introductie|inleiding|inhoud|kern|slot|afsluiting)\b",
                System.Text.RegularExpressions.RegexOptions.CultureInvariant);
        }

        private static string? CleanTitle(string? value)
        {
            var cleaned = TrimToNull(value);
            if (cleaned is null) return null;

            // Strip leading label like "Titel: " or "Onderwerp - ".
            cleaned = System.Text.RegularExpressions.Regex.Replace(
                cleaned,
                @"^\s*(?:titel(?:\s+van\s+de\s+les)?|van\s+de\s+les|onderwerp|lestitel)\s*[:\-\.]?\s*",
                string.Empty,
                System.Text.RegularExpressions.RegexOptions.IgnoreCase);

            cleaned = cleaned.Trim('"', '\'', '-', ':', ' ', '\t', '\n');

            if (cleaned.Length <= 90) return cleaned;

            var cut       = cleaned[..90];
            var lastSpace = cut.LastIndexOf(' ');
            return (lastSpace > 35 ? cut[..lastSpace] : cut).Trim();
        }

        private static string? CoalesceText(string? first, string? second)
        {
            var a = TrimToNull(first);
            var b = TrimToNull(second);
            if (a is not null) return a;
            return b;
        }

        private static string? ChooseLongestReadable(string? documentText, string? aiText)
        {
            var doc = TrimToNull(documentText);
            var ai = TrimToNull(aiText);
            if (doc is null) return ai;
            if (ai is null) return doc;
            return (doc.Length >= ai.Length ? doc : ai);
        }

        // ── Overige tekstvelden ───────────────────────────────────────────────────

        /// <summary>Kiest de meest complete extractie (langste betrouwbare tekst) voor formulier-invulling.</summary>
        private static string? ChooseFullestText(string? documentText, string? aiText)
        {
            var doc = TrimToNull(documentText);
            var ai  = TrimToNull(aiText);

            if (doc is null) return ai;
            if (ai  is null) return doc;

            var docGarbled = IsLikelyGarbledText(doc);
            var aiGarbled  = IsLikelyGarbledText(ai);

            if (docGarbled && !aiGarbled) return ai;
            if (aiGarbled  && !docGarbled) return doc;

            return doc.Length >= ai.Length ? doc : ai;
        }

        private static int ReadabilityScore(string text)
        {
            var words = System.Text.RegularExpressions.Regex.Matches(text, @"\p{L}+")
                .Select(m => m.Value)
                .ToList();

            if (words.Count == 0) return 0;

            var totalLetters   = words.Sum(w => w.Length);
            var avgWordLen     = (double)totalLetters / words.Count;
            var veryLongWords  = words.Count(w => w.Length >= 20);
            var whitespaceRatio = text.Count(char.IsWhiteSpace) / (double)Math.Max(1, text.Length);
            var punctuationCount = text.Count(c => c is '.' or ',' or ';' or ':' or '!' or '?');

            var score = 0;
            if (words.Count >= 12)                                  score += 2;
            if (avgWordLen >= 3 && avgWordLen <= 11)                score += 2;
            if (whitespaceRatio >= 0.08 && whitespaceRatio <= 0.35) score += 2;
            if (punctuationCount >= 2)                              score += 1;
            score -= Math.Min(3, veryLongWords);

            return score;
        }

        private static bool IsLikelyGarbledText(string text)
        {
            var words = System.Text.RegularExpressions.Regex.Matches(text, @"\p{L}+")
                .Select(m => m.Value)
                .ToList();

            if (words.Count == 0) return true;

            var veryLongWords   = words.Count(w => w.Length >= 20);
            var longWordRatio    = veryLongWords / (double)words.Count;
            var whitespaceRatio = text.Count(char.IsWhiteSpace) / (double)Math.Max(1, text.Length);

            return longWordRatio > 0.20 || whitespaceRatio < 0.06;
        }

        // ── Sanitize ─────────────────────────────────────────────────────────────

        private static LesAnalyseResultaat Sanitize(LesAnalyseResultaat r)
        {
            return new LesAnalyseResultaat
            {
                LessenSerieTitel = TrimToNull(r.LessenSerieTitel),
                Titel        = CleanTitle(r.Titel),
                Introductie  = TrimToNull(r.Introductie),
                Inhoud       = TrimToNull(r.Inhoud),
                Slot         = TrimToNull(r.Slot),

                Leerdoelen = r.Leerdoelen
                    .Where(n => n is >= 0 and <= 9)
                    .Distinct()
                    .OrderBy(n => n)
                    .ToList(),

                SchoolNiveau     = InRangeOrNull(r.SchoolNiveau, 0, 5),
                TaalNiveau       = InRangeOrNull(r.TaalNiveau, 0, 5),
                Leerjaar         = InRangeOrNull(r.Leerjaar, 0, 5),
                TijdsDuurMinuten = InRangeOrNull(r.TijdsDuurMinuten, 1, 600),

                Literatuurlijst = (r.Literatuurlijst ?? [])
                    .Select(TrimAndNormalizeLayout)
                    .Where(s => !string.IsNullOrWhiteSpace(s))
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .ToList()
            };
        }

        // ── Helpers ───────────────────────────────────────────────────────────────

        private static string? TrimToNull(string? value)
        {
            if (string.IsNullOrWhiteSpace(value)) return null;
            return TrimAndNormalizeLayout(value);
        }

        private static string? FirstNonEmpty(string? first, string? second)
        {
            if (!string.IsNullOrWhiteSpace(first)) return first;
            return string.IsNullOrWhiteSpace(second) ? null : second;
        }

        private static bool ContainsSectionHeadings(string value)
        {
            return System.Text.RegularExpressions.Regex.IsMatch(
                value,
                @"(^|\n)\s*(\d+[\).\-]\s*)?(introductie|inleiding|inhoud|kern|slot|afsluiting|reflectie)\s*[:\-]?\s*($|\n)",
                System.Text.RegularExpressions.RegexOptions.IgnoreCase);
        }

        private static Dictionary<string, string> ParseNarrativeSections(string text)
        {
            var sections = new Dictionary<string, System.Text.StringBuilder>(StringComparer.Ordinal)
            {
                ["Introductie"] = new(),
                ["Inhoud"]      = new(),
                ["Slot"]        = new(),
            };

            var current = "Inhoud";
            var lines   = text.Replace("\r\n", "\n").Replace('\r', '\n').Split('\n');

            foreach (var raw in lines)
            {
                var line = raw.Trim();
                if (line.Length == 0)
                {
                    if (sections[current].Length > 0) sections[current].AppendLine();
                    continue;
                }

                if (TryMapNarrativeHeading(line, out var mapped))
                {
                    current = mapped;
                    continue;
                }

                if (sections[current].Length > 0) sections[current].AppendLine();
                sections[current].Append(line);
            }

            return sections.ToDictionary(
                kvp => kvp.Key,
                kvp => TrimAndNormalizeLayout(kvp.Value.ToString()),
                StringComparer.Ordinal);
        }

        private static bool TryMapNarrativeHeading(string line, out string mappedSection)
        {
            mappedSection = string.Empty;
            var cleaned    = System.Text.RegularExpressions.Regex.Replace(line.TrimEnd(':'), @"^\s*\d+[\).\-]\s*", string.Empty);
            var normalized = new string(cleaned.ToLowerInvariant().Where(char.IsLetterOrDigit).ToArray());

            if (normalized.StartsWith("introductie") || normalized.StartsWith("inleiding") || normalized.StartsWith("start"))
            { mappedSection = "Introductie"; return true; }

            if (normalized.StartsWith("inhoud") || normalized.StartsWith("kern")
                || normalized.StartsWith("lesopzet") || normalized.StartsWith("uitwerking"))
            { mappedSection = "Inhoud"; return true; }

            if (normalized.StartsWith("slot") || normalized.StartsWith("afsluiting")
                || normalized.StartsWith("reflectie") || normalized.StartsWith("evaluatie"))
            { mappedSection = "Slot"; return true; }

            return false;
        }

        private static int? InRangeOrNull(int? value, int min, int max)
        {
            if (!value.HasValue) return null;
            return value.Value >= min && value.Value <= max ? value : null;
        }

        private static string TrimAndNormalizeLayout(string value)
        {
            var trimmed = value.Replace("\r\n", "\n").Replace('\r', '\n').Trim();
            trimmed = System.Text.RegularExpressions.Regex.Replace(trimmed, @"[ \t]+", " ");
            trimmed = System.Text.RegularExpressions.Regex.Replace(trimmed, @"\s+([,.;:!?])", "$1");
            trimmed = System.Text.RegularExpressions.Regex.Replace(trimmed, @"([,.;:!?])(\S)", "$1 $2");
            trimmed = System.Text.RegularExpressions.Regex.Replace(trimmed, @"\n{3,}", "\n\n");

            return string.Join("\n", trimmed.Split('\n').Select(l => l.Trim())).Trim();
        }
    }
}