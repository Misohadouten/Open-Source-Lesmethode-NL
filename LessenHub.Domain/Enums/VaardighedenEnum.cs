using System.Text.Json.Serialization;

namespace LessenHub.Domain.Enums;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum VaardighedenEnum
{
    Lezen,
    Luisteren,
    Schrijven,
    Spreken,
    GesprekkenVoeren,
    Reflectie,
    Taalbeschouwing,
    Literatuur,
    VakoverstijgendTaalonderwijs,
    // Legacy (bestaande uploads)
    Communicatie,
    Samenwerking,
    Probleemoplossing,
    Creativiteit,
    KritischDenken,
    Leiderschap,
    Tijdsbeheer,
    TechnologischeVaardigheden,
    Aanpassingsvermogen,
    EmotioneleIntelligentie
}
