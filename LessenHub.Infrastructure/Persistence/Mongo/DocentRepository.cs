using LessenHub.Application.Abstractions.Persistence;
using LessenHub.Domain.Entities;
using LessenHub.Infrastructure.Configuration;
using Microsoft.Extensions.Options;
using MongoDB.Driver;

namespace LessenHub.Infrastructure.Persistence.Mongo;

public class DocentRepository : IDocentRepository
{
    private readonly IMongoCollection<Docent> _collection;

    public DocentRepository(IMongoClient client, IOptions<MongoSettings> settings)
    {
        var db = client.GetDatabase(settings.Value.DatabaseName);
        _collection = db.GetCollection<Docent>("docenten");
    }

    public async Task<Docent> CreateAsync(Docent docent, CancellationToken cancellationToken = default)
    {
        if (docent.Id == Guid.Empty)
            docent.Id = Guid.NewGuid();

        await _collection.InsertOneAsync(docent, cancellationToken: cancellationToken);
        return docent;
    }

    public async Task<Docent?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _collection.Find(d => d.Id == id).FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<Docent?> GetByEmailAsync(string email, CancellationToken cancellationToken = default)
    {
        return await _collection.Find(d => d.Email == email).FirstOrDefaultAsync(cancellationToken);
    }
}
