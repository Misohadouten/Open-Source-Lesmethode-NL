using FluentAssertions;
using LessenHub.Backend.Services;
using Xunit;

namespace LessenHub.Backend.Tests;

public class PrivacyRedactionServiceTests
{
    [Fact]
    public void RedactForAi_RedactsCommonPiiPatterns()
    {
        var service = new PrivacyRedactionService();

        const string input = """
Naam: Jan Jansen
Email: jan@example.com
Telefoon: 0612345678
IBAN: NL91ABNA0417164300
BSN: 123456789
Website: https://school.example.com/les/1
Postcode: 1234 AB
""";

        var result = service.RedactForAi(input);

        result.Should().Contain("Naam: [REDACTED]");
        result.Should().Contain("Email: [REDACTED]");
        result.Should().Contain("Telefoon: [REDACTED]");
        result.Should().Contain("IBAN: [REDACTED]");
        result.Should().Contain("BSN: [REDACTED]");
        result.Should().Contain("https://school.example.com/les/1");
        result.Should().Contain("[POSTCODE]");

        result.Should().NotContain("jan@example.com");
        result.Should().NotContain("0612345678");
        result.Should().NotContain("NL91ABNA0417164300");
        result.Should().NotContain("123456789");
        result.Should().NotContain("1234 AB");
    }
}
