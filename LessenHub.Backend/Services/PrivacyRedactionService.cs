using System.Text.RegularExpressions;

using LessenHub.Application.Abstractions;

namespace LessenHub.Backend.Services;

public class PrivacyRedactionService : IPrivacyRedactionService
    {
        private static readonly Regex EmailRegex = new(
            @"\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b",
            RegexOptions.Compiled);

        private static readonly Regex PhoneRegex = new(
            @"(?:\+31\s?6\s?\d{8}|\b0\d{1,3}[\s-]?\d{6,8}\b)",
            RegexOptions.Compiled);

        private static readonly Regex IbanRegex = new(
            @"\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b",
            RegexOptions.Compiled);

        private static readonly Regex BsnRegex = new(
            @"\b\d{9}\b",
            RegexOptions.Compiled);

        private static readonly Regex PostcodeRegex = new(
            @"\b\d{4}\s?[A-Z]{2}\b",
            RegexOptions.Compiled | RegexOptions.IgnoreCase);

        // Redacts values on explicit PII-like key-value lines, e.g. "Naam: Jan".
        private static readonly Regex SensitiveLabelLineRegex = new(
            @"^(?<label>\s*(naam|leerling|docent|ouder|contactpersoon|email|e-mail|telefoon|mobiel|adres|straat|huisnummer|postcode|plaats|woonplaats|iban|bsn|studentnummer)\s*:\s*)(?<value>.+)$",
            RegexOptions.Compiled | RegexOptions.IgnoreCase | RegexOptions.Multiline);

        public string RedactForAi(string text)
        {
            if (string.IsNullOrWhiteSpace(text))
            {
                return string.Empty;
            }

            var redacted = text;

            redacted = SensitiveLabelLineRegex.Replace(redacted, "${label}[REDACTED]");
            redacted = EmailRegex.Replace(redacted, "[EMAIL]");
            redacted = PhoneRegex.Replace(redacted, "[PHONE]");
            redacted = IbanRegex.Replace(redacted, "[IBAN]");
            redacted = BsnRegex.Replace(redacted, "[BSN]");
            redacted = PostcodeRegex.Replace(redacted, "[POSTCODE]");

            return redacted;
        }
}
