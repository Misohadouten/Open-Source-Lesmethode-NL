# MongoDB voor LessenHub

## Architectuur

| Project | Rol |
|---------|-----|
| `LessenHub.Domain` | Entities en enums (geen database) |
| `LessenHub.Application` | Use cases, repository-interfaces (ports), DTO's |
| `LessenHub.Infrastructure` | MongoDB + InMemory implementaties |
| `LessenHub.Backend` | API, auth, AI-services |

## MongoDB starten

```bash
docker compose up -d mongodb
```

## Configuratie

`LessenHub.Backend/appsettings.json`:

```json
"MongoDB": {
  "ConnectionString": "mongodb://localhost:27017/",
  "DatabaseName": "lessenhubdb"
},
"UseInMemoryDatabase": false
```

Voor lokaal testen zonder Mongo: zet in `appsettings.Development.json`:

```json
"UseInMemoryDatabase": true
```

## Backend starten

```bash
cd LessenHub.Backend
dotnet run --launch-profile https
```

Health check: https://localhost:7207/health
