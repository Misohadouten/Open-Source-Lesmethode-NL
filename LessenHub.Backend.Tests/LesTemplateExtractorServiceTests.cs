using FluentAssertions;
using LessenHub.Backend.Services;
using Xunit;

namespace LessenHub.Backend.Tests;

public class LesTemplateExtractorServiceTests
{
    [Fact]
    public void Extract_ParsesLabeledTemplateFieldsExactly()
    {
        var service = new LesTemplateExtractorService();
        const string text = """
Titel: Argumenteren in het Nederlands
Introductie:
Vandaag oefenen we met stellingen.
Inhoud:
Leerlingen schrijven een betoog met argumenten en tegenargumenten.
Slot:
Klassikale reflectie en feedback.
Leerdoelen: Schrijven, Kritisch Denken
Schoolniveau: HAVO
Taalniveau: B1
Leerjaar: Derde
Tijdsduur: 1 uur 30 minuten
""";

        var result = service.Extract(text);

        result.Titel.Should().Be("Argumenteren in het Nederlands");
        result.Introductie.Should().Contain("Vandaag oefenen we met stellingen.");
        result.Inhoud.Should().Contain("Leerlingen schrijven een betoog");
        result.Slot.Should().Contain("Klassikale reflectie");
        result.Leerdoelen.Should().BeEquivalentTo([1, 7]);
        result.SchoolNiveau.Should().Be(1);
        result.TaalNiveau.Should().Be(2);
        result.Leerjaar.Should().Be(2);
        result.TijdsDuurMinuten.Should().Be(90);
    }

    [Fact]
    public void Extract_ParsesNumericEnumsAndDurationFormats()
    {
        var service = new LesTemplateExtractorService();
        const string text = """
Titel: Lezen op niveau
Introductie: Intro tekst
Inhoud: Inhoud tekst
Slot: Slot tekst
Leerdoelen: 0, 4, 9
SchoolNiveau: 2
TaalNiveau: 3
Leerjaar: 5
Tijdsduur: 00:45
""";

        var result = service.Extract(text);

        result.Leerdoelen.Should().BeEquivalentTo([0, 4, 9]);
        result.SchoolNiveau.Should().Be(2);
        result.TaalNiveau.Should().Be(3);
        result.Leerjaar.Should().Be(5);
        result.TijdsDuurMinuten.Should().Be(45);
    }

    [Fact]
    public void Extract_ParsesLiteratureHeadingsAndNormalizesLayout()
    {
        var service = new LesTemplateExtractorService();
        const string text = """
Titel:  Spelling   en grammatica
Introductie:
We   starten met  een   korte opwarming .

Inhoud:
Uitleg  over  werkwoordspelling, daarna oefenopgaven.

Slot:
Nabespreking  en  reflectie .

Bronnen:
- Taalunie - Werkwoorden
• https://taaladvies.net/
* Methode Nederlands klas 3
""";

        var result = service.Extract(text);

        result.Titel.Should().Be("Spelling en grammatica");
        result.Introductie.Should().Be("We starten met een korte opwarming.");
        result.Slot.Should().Be("Nabespreking en reflectie.");
        result.Literatuurlijst.Should().HaveCount(3);
        result.Literatuurlijst.Should().Contain("Taalunie - Werkwoorden");
        result.Literatuurlijst.Should().Contain("https://taaladvies.net/");
        result.Literatuurlijst.Should().Contain("Methode Nederlands klas 3");
    }

    [Fact]
    public void Extract_FindsInlineCitations_WhenNoLiteratureHeadingExists()
    {
        var service = new LesTemplateExtractorService();
        const string text = """
Titel: Woordenschat en begrijpend lezen
Introductie: Inleiding van de les.
Inhoud: Woordenschat is een belangrijke bouwsteen (Van Steensel & Houtveen, 2020).
Slot: Afronding met reflectie (kennisrotonde, 2019).
""";

        var result = service.Extract(text);

        result.Literatuurlijst.Should().Contain("Van Steensel & Houtveen, 2020");
        result.Literatuurlijst.Should().Contain("kennisrotonde, 2019");
    }

    [Fact]
    public void Extract_OfficialLessonStyleWithoutStrictLabels_FillsCoreFields()
    {
        var service = new LesTemplateExtractorService();
        const string text = """
Het modelleren van rijke teksten bij Nederlands en economie

Doel van de les
In deze les onderzoeken leerlingen hoe rijke teksten bijdragen aan taalontwikkeling.

Lesopzet
De docent activeert voorkennis, modelt hardop hoe een tekst gelezen wordt en laat leerlingen daarna in tweetallen een economische tekst analyseren.
Vervolgens verwerken leerlingen de kernbegrippen in een korte schrijfopdracht.

Afsluiting en reflectie
We sluiten af met een klassikale terugblik en leerlingen benoemen welke leesstrategie hen hielp.

Niveau: HAVO
Leerjaar: 4
Duur: 75 minuten
Leerdoelen: Begrijpend lezen, Schrijven, Kritisch Denken

Bronnen
- https://www.slo.nl/thema/vakspecifieke-themas/nederlands/
""";

        var result = service.Extract(text);

        result.Titel.Should().Contain("modelleren van rijke teksten", "de titel moet uit de eerste regel kunnen komen");
        result.Introductie.Should().Contain("onderzoeken leerlingen", "de introductie moet uit de eerste inhoudelijke alinea komen");
        result.Inhoud.Should().Contain("modelt hardop", "de kerninhoud moet uit de lesopzet komen");
        result.Slot.Should().Contain("klassikale terugblik", "de afsluiting moet uit slot/reflexie-paragraaf komen");
        result.SchoolNiveau.Should().Be(1);
        result.Leerjaar.Should().Be(3);
        result.TijdsDuurMinuten.Should().Be(75);
        result.Leerdoelen.Should().Contain([0, 1, 7]);
        result.Literatuurlijst.Should().Contain("https://www.slo.nl/thema/vakspecifieke-themas/nederlands/");
    }
}
