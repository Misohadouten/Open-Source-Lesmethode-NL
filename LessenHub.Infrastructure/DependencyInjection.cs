using LessenHub.Application.Abstractions.Persistence;
using LessenHub.Infrastructure.Configuration;
using LessenHub.Infrastructure.Persistence;
using LessenHub.Infrastructure.Persistence.InMemory;
using LessenHub.Infrastructure.Persistence.Mongo;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Hosting;
using MongoDB.Bson;
using MongoDB.Bson.Serialization;
using MongoDB.Bson.Serialization.Serializers;
using MongoDB.Driver;

namespace LessenHub.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration,
        IHostEnvironment environment)
    {
        services.Configure<MongoSettings>(configuration.GetSection("MongoDB"));

        var useInMemory = configuration.GetValue<bool>("UseInMemoryDatabase");
        if (useInMemory)
        {
            services.AddSingleton<InMemoryDataStore>();
            services.AddSingleton<IDocentRepository, Persistence.InMemory.DocentRepository>();
            services.AddSingleton<ILessenSerieRepository, Persistence.InMemory.LessenSerieRepository>();
            services.AddSingleton<ILesRepository, Persistence.InMemory.LesRepository>();
        }
        else
        {
            BsonSerializer.RegisterSerializer(new GuidSerializer(BsonType.String));
            MongoDbClassMaps.Register();

            services.AddSingleton<IMongoClient>(sp =>
            {
                var settings = sp.GetRequiredService<Microsoft.Extensions.Options.IOptions<MongoSettings>>().Value;
                var clientSettings = MongoClientSettings.FromConnectionString(settings.ConnectionString);
                clientSettings.ServerSelectionTimeout = environment.IsDevelopment()
                    ? TimeSpan.FromSeconds(5)
                    : TimeSpan.FromSeconds(30);
                return new MongoClient(clientSettings);
            });

            services.AddSingleton<IDocentRepository, Persistence.Mongo.DocentRepository>();
            services.AddSingleton<ILessenSerieRepository, Persistence.Mongo.LessenSerieRepository>();
            services.AddSingleton<ILesRepository, Persistence.Mongo.LesRepository>();

            services.AddHealthChecks()
                .AddCheck<Health.MongoHealthCheck>("mongodb", tags: ["ready"]);
        }

        return services;
    }
}
