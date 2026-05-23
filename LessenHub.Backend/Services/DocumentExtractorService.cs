using System.Text;
using System.Text.RegularExpressions;

namespace LessenHub.Backend.Services
{
    public class DocumentExtractorService
    {
        private readonly ILogger<DocumentExtractorService> _logger;

        public DocumentExtractorService(ILogger<DocumentExtractorService> logger)
        {
            _logger = logger;
        }

        public async Task<string> ExtractTekst(IFormFile bestand)
        {
            var extension = ResolveExtension(bestand);
            await using var stream = bestand.OpenReadStream();
            var bytes = await LeesStream(stream);

            return extension switch
            {
                ".pdf" => ExtractUitPdfBytes(bytes, bestand.FileName),
                ".docx" => await ExtractUitDocxBytes(bytes),
                _ => throw new NotSupportedException($"Bestandstype {extension} wordt niet ondersteund."),
            };
        }

        public static string ResolveExtension(IFormFile bestand)
        {
            var ext = Path.GetExtension(bestand.FileName).ToLowerInvariant();
            if (ext is ".pdf" or ".docx")
            {
                return ext;
            }

            var mime = bestand.ContentType?.ToLowerInvariant() ?? string.Empty;
            if (mime.Contains("pdf", StringComparison.Ordinal))
            {
                return ".pdf";
            }

            if (mime.Contains("wordprocessingml", StringComparison.Ordinal)
                || mime.Contains("msword", StringComparison.Ordinal))
            {
                return ".docx";
            }

            return ext;
        }

        private string ExtractUitPdfBytes(byte[] bytes, string fileName)
        {
            _logger.LogInformation("PDF extractie start: {Bestand}, {Bytes} bytes", fileName, bytes.Length);

            if (bytes.Length < 5 || !LooksLikePdf(bytes))
            {
                _logger.LogWarning("Bestand lijkt geen geldige PDF: {Bestand}", fileName);
                return string.Empty;
            }

            string documentText;
            try
            {
                documentText = PdfTextExtractor.ExtractFromBytes(bytes);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "PDF extractie mislukt voor {Bestand}", fileName);
                return string.Empty;
            }

            documentText = NormalizeExtractedText(documentText);

            var preview = documentText.Length > 1000 ? documentText[..1000] : documentText;
            _logger.LogInformation(
                "PDF documentText: {Chars} tekens, {Lines} regels. Eerste 1000: {Preview}",
                documentText.Length,
                documentText.Count(c => c == '\n') + 1,
                preview);

            return documentText;
        }

        private static bool LooksLikePdf(byte[] bytes)
        {
            return bytes.Length >= 4
                && bytes[0] == 0x25
                && bytes[1] == 0x50
                && bytes[2] == 0x44
                && bytes[3] == 0x46;
        }

        private static async Task<string> ExtractUitDocxBytes(byte[] bytes)
        {
            using var memStream = new MemoryStream(bytes);
            using var wordDoc = DocumentFormat.OpenXml.Packaging.WordprocessingDocument.Open(memStream, false);
            var body = wordDoc.MainDocumentPart?.Document?.Body;
            if (body == null) return string.Empty;

            var sb = new StringBuilder();

            foreach (var element in body.Elements())
            {
                switch (element)
                {
                    case DocumentFormat.OpenXml.Wordprocessing.Paragraph para:
                        AppendParagraphText(para, sb);
                        break;
                    case DocumentFormat.OpenXml.Wordprocessing.Table table:
                        AppendTableText(table, sb);
                        break;
                }
            }

            if (sb.Length == 0)
            {
                foreach (var para in body.Descendants<DocumentFormat.OpenXml.Wordprocessing.Paragraph>())
                {
                    AppendParagraphText(para, sb);
                }
            }

            if (sb.Length == 0)
            {
                var flat = body.InnerText;
                if (!string.IsNullOrWhiteSpace(flat))
                {
                    sb.Append(LesDocumentTextPrep.NormalizePdfEncoding(flat));
                }
            }

            var text = NormalizeExtractedText(sb.ToString());
            return LesDocumentTextPrep.InjectLineBreaksBeforeLabels(text);
        }

        private static void AppendParagraphText(DocumentFormat.OpenXml.Wordprocessing.Paragraph para, StringBuilder sb)
        {
            var text = para.InnerText;
            if (!string.IsNullOrWhiteSpace(text))
            {
                sb.AppendLine(text.Trim());
            }
        }

        private static void AppendTableText(DocumentFormat.OpenXml.Wordprocessing.Table table, StringBuilder sb)
        {
            foreach (var row in table.Elements<DocumentFormat.OpenXml.Wordprocessing.TableRow>())
            {
                var cells = row.Elements<DocumentFormat.OpenXml.Wordprocessing.TableCell>()
                    .Select(c => Regex.Replace(c.InnerText ?? string.Empty, @"\s+", " ").Trim())
                    .Where(c => c.Length > 0)
                    .ToList();

                if (cells.Count >= 2 && LesTemplateExtractorService.TryResolveFieldLabel(cells[0], out _))
                {
                    sb.AppendLine(cells[0]);
                    sb.AppendLine(string.Join(" ", cells.Skip(1)));
                    sb.AppendLine();
                    continue;
                }

                foreach (var cell in cells)
                {
                    sb.AppendLine(cell);
                }
            }
        }

        private static string NormalizeExtractedText(string raw)
        {
            if (string.IsNullOrWhiteSpace(raw))
            {
                return string.Empty;
            }

            var normalized = LesDocumentTextPrep.NormalizePdfEncoding(raw);
            normalized = normalized.Replace("\r\n", "\n").Replace('\r', '\n');

            normalized = Regex.Replace(normalized,
                @"(\p{L}+)-\s*\n?\s*\d+\.\s*\n?\s*(\p{L}+)",
                "$1$2");

            normalized = Regex.Replace(normalized,
                @"(\p{L}+)-\s*\n\s*\d+\s*\n\s*(\p{L}+)",
                "$1$2");

            normalized = Regex.Replace(normalized,
                @"(\p{L})-\s*\n\s*(\p{L})",
                "$1$2");

            normalized = Regex.Replace(normalized, @"[ \t]+", " ");
            normalized = Regex.Replace(normalized, @"\n{3,}", "\n\n");

            var lines = normalized
                .Split('\n')
                .Select(line => line.Trim())
                .Where(line => line.Length > 0)
                .ToArray();

            return string.Join("\n", lines).Trim();
        }

        private static async Task<byte[]> LeesStream(Stream stream)
        {
            using var ms = new MemoryStream();
            await stream.CopyToAsync(ms);
            return ms.ToArray();
        }
    }
}
