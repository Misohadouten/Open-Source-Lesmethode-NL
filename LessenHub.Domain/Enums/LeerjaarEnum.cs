using System.Text.Json.Serialization;

namespace LessenHub.Domain.Enums;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum LeerjaarEnum
{
    EersteLeerjaar,
    TweedeLeerjaar,
    DerdeLeerjaar,
    VierdeLeerjaar,
    VijfdeLeerjaar,
    ZesdeLeerjaar
}
