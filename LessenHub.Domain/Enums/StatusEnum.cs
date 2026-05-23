using System.Text.Json.Serialization;

namespace LessenHub.Domain.Enums;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum StatusEnum
{
    Nieuw,
    Concept,
    Beschikbaar,
    Afgewezen,
    Verwijderd
}
