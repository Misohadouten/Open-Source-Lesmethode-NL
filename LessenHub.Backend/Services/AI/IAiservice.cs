namespace LessenHub.Backend.Services.AI
{
    public class LesAnalyseResultaat
    {
        public string? LessenSerieTitel { get; set; }
        public string? Titel { get; set; }
        public string? Introductie { get; set; }
        public string? Inhoud { get; set; }
        public string? Slot { get; set; }
        public List<int> Leerdoelen { get; set; } = [];
        public int? SchoolNiveau { get; set; }
        public int? TaalNiveau { get; set; }
        public int? Leerjaar { get; set; }
        public int? TijdsDuurMinuten { get; set; }
        public List<string> Literatuurlijst { get; set; } = [];
        public double Confidence { get; set; } = 0.0;
    }

    public interface IAiService
    {
        Task<LesAnalyseResultaat> AnalyseerLesDocument(string documentTekst);
    }
}