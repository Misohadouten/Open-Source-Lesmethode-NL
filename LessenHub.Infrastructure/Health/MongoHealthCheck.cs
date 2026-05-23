using LessenHub.Infrastructure.Configuration;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Options;
using MongoDB.Bson;
using MongoDB.Driver;

namespace LessenHub.Infrastructure.Health;

public class MongoHealthCheck(IMongoClient client, IOptions<MongoSettings> settings) : IHealthCheck
{
    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var db = client.GetDatabase(settings.Value.DatabaseName);
            await db.RunCommandAsync<BsonDocument>(
                new BsonDocument("ping", 1),
                cancellationToken: cancellationToken);
            return HealthCheckResult.Healthy("MongoDB bereikbaar");
        }
        catch (Exception ex)
        {
            return HealthCheckResult.Unhealthy("MongoDB niet bereikbaar", ex);
        }
    }
}
