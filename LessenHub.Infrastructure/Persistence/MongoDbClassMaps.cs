using LessenHub.Domain.Entities;
using MongoDB.Bson;
using MongoDB.Bson.Serialization;
using MongoDB.Bson.Serialization.Serializers;

namespace LessenHub.Infrastructure.Persistence;

public static class MongoDbClassMaps
{
    private static bool _registered;

    public static void Register()
    {
        if (_registered)
            return;

        RegisterMap<Docent>(x => x.Id);
        RegisterMap<Les>(x => x.Id);
        RegisterMap<LessenSerie>(x => x.Id);
        RegisterMap<Bijlage>(x => x.Id);

        if (!BsonClassMap.IsClassMapRegistered(typeof(Beoordeling)))
        {
            BsonClassMap.RegisterClassMap<Beoordeling>(cm => cm.AutoMap());
        }

        _registered = true;
    }

    private static void RegisterMap<T>(System.Linq.Expressions.Expression<Func<T, Guid>> idMember)
    {
        if (BsonClassMap.IsClassMapRegistered(typeof(T)))
            return;

        BsonClassMap.RegisterClassMap<T>(cm =>
        {
            cm.AutoMap();
            cm.MapIdMember(idMember).SetSerializer(new GuidSerializer(BsonType.String));
        });
    }
}
