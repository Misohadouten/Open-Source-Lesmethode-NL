namespace LessenHub.Backend.Services.AI
{
    public static class LesAnalyseExtractionPrompt
    {
        public static string Bouw(string documentTekst) =>
            """
            Analyseer de documenttekst en haal lesgegevens eruit. Het document kan Nederlands zijn en kan labels bevatten zoals Lessenserie, Omschrijving, Introductie, Inhoud, Afsluiting, Leerdoel, Tijdsduur, Schoolniveau en Taalniveau.

            Geef ALTIJD geldige JSON terug, zonder markdown en zonder uitleg.

            Gebruik exact dit schema:
            {
              "title": "",
              "description": "",
              "introduction": "",
              "content": "",
              "closing": "",
              "duration": "",
              "level": "",
              "languageLevel": "",
              "learningGoals": []
            }

            Regels:
            - Als "Lessenserie:" aanwezig is, gebruik dat als title.
            - Als "Omschrijving:" aanwezig is, gebruik dat als description.
            - Als "Introductie:" aanwezig is, gebruik dat als introduction.
            - Als "Inhoud:" aanwezig is, gebruik dat als content.
            - Als "Afsluiting:" aanwezig is, gebruik dat als closing.
            - Als "Tijdsduur:" aanwezig is, gebruik dat als duration.
            - Als "Schoolniveau:" aanwezig is, gebruik dat als level.
            - Als "Taalniveau:" aanwezig is, gebruik dat als languageLevel.
            - Als "Leerdoel:" aanwezig is, zet de doelen in learningGoals.
            - Als een veld ontbreekt, gebruik een lege string of lege array.
            - Gebruik alleen tekst uit het document; verzin niets.

            DOCUMENT:
            """ + documentTekst;
    }
}
