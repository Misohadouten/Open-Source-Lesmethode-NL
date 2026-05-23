using System.Text.Json.Serialization;

namespace LessenHub.Domain.Enums;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum LeerdoelEnum
{
    BegrijpendLezen,
    Schrijven,
    Luisteren,
    Spreken,
    Woordenschat,
    Grammatica,
    Cultuurbegrip,
    KritischDenken,
    Samenwerken,
    Probleemoplossing
}
