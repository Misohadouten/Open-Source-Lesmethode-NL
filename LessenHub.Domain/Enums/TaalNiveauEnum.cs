using System.Text.Json.Serialization;

namespace LessenHub.Domain.Enums;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum TaalNiveauEnum
{
    A1,
    A2,
    B1,
    B2,
    C1,
    C2
}
