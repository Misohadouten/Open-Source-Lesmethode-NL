using System.Text.Json.Serialization;

namespace LessenHub.Domain.Enums;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum SchoolNiveauEnum
{
    VMBO,
    HAVO,
    VWO,
    MBO
}
