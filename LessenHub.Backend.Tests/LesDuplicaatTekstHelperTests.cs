using FluentAssertions;
using LessenHub.Backend.Services;
using Xunit;

namespace LessenHub.Backend.Tests;

public class LesDuplicaatTekstHelperTests
{
    [Fact]
    public void BerekenLexicaleOverlap_IsHoog_BijVergelijkbareTekst()
    {
        var links = LesDuplicaatTekstHelper.Tokenize(
            "Samenvatten met signaalwoorden. Lees de tekst en onderstreep belangrijke woorden.");
        var rechts = LesDuplicaatTekstHelper.Tokenize(
            "Je leest de tekst en onderstreept signaalwoorden om te kunnen samenvatten.");

        var score = LesDuplicaatTekstHelper.BerekenLexicaleOverlap(links, rechts);

        score.Should().BeGreaterThan(0.2);
    }

    [Fact]
    public void BerekenLexicaleOverlap_IsLaag_BijVerschillendeOnderwerpen()
    {
        var links = LesDuplicaatTekstHelper.Tokenize("Fotosynthese in planten en chlorofyl.");
        var rechts = LesDuplicaatTekstHelper.Tokenize("De Tweede Wereldoorlog en bezetting.");

        var score = LesDuplicaatTekstHelper.BerekenLexicaleOverlap(links, rechts);

        score.Should().BeLessThan(0.1);
    }
}
