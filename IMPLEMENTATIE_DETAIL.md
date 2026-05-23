# Implementatie - Gedetailleerde Documentatie

## Wat er daadwerkelijk is gebouwd

### Codebase Structuur

We hebben de applicatie structuur opgezet op basis van API's, dit kan je zien in hoofdstuk 3 "Level 3 – Component diagram". Elke API heeft als doel een stuk functionaliteit te faciliteren tussen de frontend (NextJS) en databases (MongoDB & Next Cloud).

#### Architectuurpatroon: Layered Architecture met Repository Pattern

De applicatie volgt een gestructureerde drie-lagenarchitectuur:

1. **Controllers-laag** (`LessenHub.Backend/Controllers/`)
   - Verwerkt HTTP-requests van de frontend
   - Valideert input en geeft HTTP-responses terug
   - Roept de Repository-laag aan voor gegevensoperaties

2. **Repository-laag** (`LessenHub.Backend/Repositories/`)
   - Abstraheert databasebewerkingen via interfaces
   - Implementaties voor MongoDB (Mongo/) en InMemory-opslag
   - Zorgt voor ontkoppeling tussen controllers en database

3. **Models-laag** (`LessenHub.Backend/Models/`)
   - Datastrukturen die overeenkomen met database-entiteiten
   - Bevat enumeraties voor constante waarden

---

## Overzicht van de API's

### 1. **Docent API** 
**Verantwoordelijk voor:** Beheer van docent-accounts en informatie

**Endpoints:**
- `GET /docent/{id}` - Haalt een docent op via ID
- `POST /docent` - Maakt een nieuwe docent aan

**Data Model:**
```csharp
public class Docent
{
    public Guid Id { get; set; }
    public string Naam { get; set; }
    public string Email { get; set; }
}
```

**Functionaliteit:**
- Gebruikersgegevens opslaan en ophalen
- Gekoppeld aan SurfConext-authenticatie
- Basis voor authorisatie in het systeem

---

### 2. **Lessenserie API**
**Verantwoordelijk voor:** Beheer van lessenreeksen (verzameling van lessen)

**Endpoints:**
- `GET /lessenserie` - Haalt alle lessenseries op (gefilterd op docentId)
- `GET /lessenserie/{id}` - Haalt een specifieke lessenserie op
- `GET /lessenserie/status/{status}` - Haalt lessenseries gefilterd op status
- `POST /lessenserie` - Maakt een nieuwe lessenserie aan
- `PUT /lessenserie/{id}` - Werkt een lessenserie bij
- `GET /lessenserie/indienen/{id}` - Markeert lessenserie als ingediend

**Data Model:**
```csharp
public class LessenSerie
{
    public Guid Id { get; set; }
    public string Titel { get; set; }
    public string Omschrijving { get; set; }
    public List<LeerdoelEnum> Leerdoelen { get; set; }
    public SchoolNiveauEnum SchoolNiveau { get; set; }
    public TaalNiveauEnum TaalNiveau { get; set; }
    public LeerjaarEnum Leerjaar { get; set; }
    public List<VaardighedenEnum> Vaardigheden { get; set; }
    public int AantalLessen { get; set; }
    public TimeSpan TijdsDuur { get; set; }
    public StatusEnum Status { get; set; }
    public List<string> Literatuurlijst { get; set; }
    public Docent Eigenaar { get; set; }
    public List<Les> Lessen { get; set; }
    public List<Bijlage> Bijlagen { get; set; }
    public List<Beoordeling> Beoordelingen { get; set; }
}
```

**Functionaliteit:**
- Beheer van complete lessenreeksen
- Koppeling van individuele lessen
- Statussen: Concept, Ingediend, Goedgekeurd, Afgewezen
- Metadata: schoolniveau, taalniveau, leerjaar
- Vaardigheidstraining: Communicatie, Samenwerking, Probleemoplossing, Creativiteit, Kritisch Denken, Leiderschap, Tijdsbeheer, Technologische Vaardigheden, Aanpassingsvermogen, Emotionele Intelligentie

---

### 3. **Les API**
**Verantwoordelijk voor:** Beheer van individuele lessen

**Endpoints:**
- `GET /les/{id}` - Haalt een les op via ID
- `POST /les` - Maakt een nieuwe les aan
- `PUT /les/{id}` - Werkt een les bij
- `DELETE /les/{id}` - Verwijdert een les

**Data Model:**
```csharp
public class Les
{
    public Guid Id { get; set; }
    public string Titel { get; set; }
    public List<LeerdoelEnum> Leerdoel { get; set; }
    public string Introductie { get; set; }
    public string Inhoud { get; set; }
    public string Slot { get; set; }
    public TimeSpan TijdsDuur { get; set; }
}
```

**Functionaliteit:**
- Opbouw les: Introductie > Inhoud > Slot
- Leerdoelen per les definiëren
- Duurschatting in TimeSpan-format
- Onderdeel van Lessenserie

---

### 4. **Bijlage API** (TBD)
**Verantwoordelijk voor:** Beheer van lessenmateriaal en attachments

**Geplande Functionaliteit:**
- Upload van PDF's, afbeeldingen, documenten
- Koppeling aan Lessenseries/Lessen
- Integratie met NextCloud voor opslag
- Downloadfunctionaliteit

---

### 5. **Zoeken API** (TBD)
**Verantwoordelijk voor:** Zoek- en filterfunctionaliteit

**Geplande Functionaliteit:**
- Zoeken op titel, beschrijving
- Filteren op schoolniveau, taalniveau, vaardigheden
- Volledige tekst zoeken (full-text search)

---

### 6. **Downloaden API**
**Verantwoordelijk voor:** Export van lessenseries naar PDF

**Functionaliteit:**
- PDF-generatie via iText7 library
- Inclusief: Algemene info, vaardigheden, literatuurlijst, alle lessen
- Batch-download support

**Implementatie:**
```csharp
public class PdfGeneratorService
{
    public byte[] GenerateLessenSeriePdf(LessenSerie lessenSerie)
    {
        // Genereert PDF met complete lessenserie-inhoud
    }
}
```

---

### 7. **Security API**
**Verantwoordelijk voor:** Authenticatie en autorisatie

**Implementatie:**
- **OpenID Connect** via **SurfConext**
- Cookie-based sessions
- CORS-configuratie voor frontend (localhost:3000)

**Endpoints:**
- `GET /api/auth/surfconext/login` - Start SurfConext login flow
- `GET /api/auth/logout` - Logout en session cleanup

**Configuratie:**
```json
{
  "SurfConext": {
    "Authority": "https://connect.test.surfconext.nl",
    "ClientId": "dev.opsnederland.nl",
    "ClientSecret": "***"
  },
  "Frontend": {
    "Url": "https://localhost:3000"
  }
}
```

---

### 8. **Beoordelen API** (Deels geïmplementeerd)
**Verantwoordelijk voor:** Rating en feedback op lessenseries

**Data Model:**
```csharp
public class Beoordeling
{
    public int? Rating { get; set; }      // 1-5 sterren
    public string? Commentaar { get; set; }
    public Docent Eigenaar { get; set; }
    public LessenSerie LessenSerie { get; set; }
}
```

**Geplande Functionaliteit:**
- Rating (1-5 sterren)
- Tekstuele reviews
- Moderatie door admin

---

### 9. **Waarderen API** (TBD)
**Verantwoordelijk voor:** Waardering/bookmarking van lessenseries

**Geplande Functionaliteit:**
- Markeren als favoriet
- Persoonlijke collecties
- Delen met collega's

---

## Belangrijkste Modules en Verantwoordelijkheden

### Controllers (`Controllers/`)
| Controller | Verantwoordelijkheid |
|-----------|---------------------|
| `AuthController` | SurfConext login/logout, session management |
| `DocentController` | CRUD voor docent-gegevens |
| `LesController` | CRUD voor individuele lessen |
| `LessenSerieController` | CRUD voor lessenreeksen, status management |

### Repositories (`Repositories/`)

**Interface-laag (`Interfaces/`):**
- `IDocentRepository` - Contract voor docent-opslag
- `ILesRepository` - Contract voor les-opslag
- `ILessenSerieRepository` - Contract voor lessenserie-opslag

**MongoDB-implementatie (`Mongo/`):**
- Communicatie met MongoDB via MongoDB.Driver
- Async-operaties via EF-like API
- Collectie-mapping naar database-documents

**InMemory-implementatie (`InMemory/`):**
- Testing en development zonder database
- Mock-data in geheugen opslaan

### Models (`Models/`)

**Entiteiten:**
- `Docent` - Gebruiker/onderwijzer
- `Les` - Individuele lesseneenheid
- `LessenSerie` - Verzameling van lessen
- `Beoordeling` - Rating/review
- `Bijlage` - Lesmateriaal (WIP)

**Enumeraties (`Enums/`):**
- `LeerdoelEnum` - 8 leerscenario's (Kennis, Begrip, Toepassing, etc.)
- `SchoolNiveauEnum` - Onderwijsniveaus (PO, VO, HBO, etc.)
- `TaalNiveauEnum` - Taalvaardigheidslevels (A1-C2)
- `LeerjaarEnum` - Schooljaren (Groep 1-12)
- `StatusEnum` - Lessenserie-statussen (Concept, Ingediend, Goedgekeurd, Afgewezen)
- `VaardighedenEnum` - 10 21e-eeuwse vaardigheden

### Services (`Services/`)

**PdfGeneratorService:**
- Gegenereerd PDF van lessenseries
- Gebruiker iText7 (open-source PDF library)
- Inclusief tabellen, paragrafen, opmaak

---

## Coding Standards / Conventies

### 1. **Naamgeving**
- **PascalCase** voor klassen, properties, methods
- **camelCase** voor lokale variabelen
- **UPPER_CASE** voor constanten (indien nodig)
- Naamgeving in het Nederlands voor domain-logica, Engels voor technische termen

Voorbeelden:
```csharp
public class LessenSerie { }           // Klasse
public List<Les> Lessen { get; set; } // Property
public Guid GetLessenSerieById() { }   // Method
private string beschrijving = "";      // Lokale variabele
```

### 2. **Error Handling**
- Try-catch blokken in controllers met generieke foutmeldingen
- HTTP status codes (200, 201, 400, 404, 500)
- Nederlandse foutmeldingen naar client

```csharp
try 
{
    // Database-operatie
}
catch (Exception)
{
    return StatusCode(500, "Er is een fout opgetreden bij het ophalen van de les.");
}
```

### 3. **Dependency Injection**
- Constructor-injection voor repositories en services
- Primary constructors (C# 12+) waar mogelijk
- Registratie in `Program.cs`

```csharp
public class LessenSerieController(
    ILessenSerieRepository repository, 
    PdfGeneratorService pdfGenerator) : ControllerBase
{
    // Services via DI constructor
}
```

### 4. **Async/Await**
- Async methods waar van toepassing (MongoDB.Driver)
- `.GetAwaiter().GetResult()` voor synchrone context (legacy pattern)

### 5. **Validatie**
- Null-checks voor input
- BadRequest (400) voor invalid data
- Expliciete foutmeldingen

```csharp
if (les == null)
    return BadRequest("Les data is required.");
```

### 6. **CORS & Security**
- CORS-policy per environment
- Secure cookies (SameSite=None, Secure=Always)
- HTTPS in productie

---

## Frameworks & Libraries

### Backend (.NET)

| Library | Versie | Doel |
|---------|--------|------|
| **ASP.NET Core** | 10.0.1 | Web framework |
| **MongoDB.Driver** | 3.5.1 | MongoDB client |
| **Microsoft.AspNetCore.Authentication.OpenIdConnect** | 10.0.1 | SurfConext SSO |
| **iText7** | 7.3.0 | PDF-generatie |
| **iText7.BouncyCastle.Adapter** | 7.3.0 | Cryptografie voor PDF |
| **Microsoft.AspNetCore.OpenApi** | 10.0.1 | OpenAPI/Swagger support |

### Frontend (TypeScript/React)

| Library | Versie | Doel |
|---------|--------|------|
| **Next.js** | Recente | React framework |
| **TypeScript** | Recent | Type-safe JavaScript |
| **ESLint** | Recent | Code linting |
| **PostCSS** | Recent | CSS processing |

### Database
- **MongoDB** - NoSQL document database
- **NextCloud** - Cloud storage (geplande integratie)

---

## Configuratie (env variables, secrets, feature flags)

### Backend Configuration

**appsettings.json** (Development):
```json
{
  "MongoDB": {
    "ConnectionString": "mongodb://localhost:27017/",
    "DatabaseName": "lessenhubdb"
  },
  "SurfConext": {
    "Authority": "https://connect.test.surfconext.nl",
    "ClientId": "dev.opsnederland.nl",
    "ClientSecret": "***" // Via User Secrets in dev
  },
  "Frontend": {
    "Url": "https://localhost:3000"
  },
  "AllowedHosts": "*"
}
```

**appsettings.Development.json** (Local Development):
- Kan standaard instellingen overschrijven
- Locale MongoDB connection string

**User Secrets** (Veilige credentials):
```bash
dotnet user-secrets set "SurfConext:ClientSecret" "value"
```

### Environment-Specifieke Configuratie

**Development:**
- Localhost URLs
- Local MongoDB
- RequireHttpsMetadata = false
- CORS: localhost:3000

**Production:**
- HTTPS enforced
- Cloud MongoDB (NextCloud)
- Omgevingsvariabelen via Docker/deployment
- Restrictieve CORS-policies

### Docker Configuratie

**docker-compose.yml:**
- MongoDB service
- Backend service
- Frontend service

**Dockerfile & Dockerfile.prod:**
- Multi-stage builds
- Production optimization
- .NET runtime

### Geheimen Beheer

Gevoelige waarden worden beheerd via:
1. **Development:** dotnet user-secrets
2. **Deployment:** Environment variables / Secret vaults
3. **Docker:** Environment file (.env)

---

## Database Schema (MongoDB)

### Collections

**`docenten`** (Docenten):
```javascript
{
  _id: ObjectId,
  Id: UUID,
  Naam: string,
  Email: string
}
```

**`lessenseries`** (Lessenreeksen):
```javascript
{
  _id: ObjectId,
  Id: UUID,
  Titel: string,
  Omschrijving: string,
  Leerdoelen: [enum],
  SchoolNiveau: enum,
  TaalNiveau: enum,
  Leerjaar: enum,
  Vaardigheden: [enum],
  AantalLessen: number,
  TijdsDuur: TimeSpan,
  Status: enum,
  Literatuurlijst: [string],
  Eigenaar: { Docent object },
  Lessen: [{ Les objects }],
  Bijlagen: [{ Bijlage objects }],
  Beoordelingen: [{ Beoordeling objects }]
}
```

**`lessen`** (Lessen):
```javascript
{
  _id: ObjectId,
  Id: UUID,
  Titel: string,
  Leerdoel: [enum],
  Introductie: string,
  Inhoud: string,
  Slot: string,
  TijdsDuur: TimeSpan
}
```

---

## Deployment & Hosting

### Docker
- Docker Compose setup voor lokale development
- Separate Dockerfile.prod voor production builds
- Network isolation tussen services

### Environment Targets
- **Local:** dotnet run / watch mode
- **Docker:** Container-based deployment
- **Cloud (toekomstig):** Kubernetes / App Service

---

## Roadmap - TBD Items

1. **Bijlage/Materialen Management**
   - NextCloud integratie
   - File upload/download
   - Versioning

2. **Zoeken & Filteren**
   - Full-text search
   - Advanced filters
   - Tag system

3. **Waardering System**
   - Favoriet markeren
   - Persoonlijke collections
   - Sharing met collega's

4. **Admin Dashboard**
   - Moderation tools
   - Usage analytics
   - Approval workflows

5. **API Documentation**
   - Swagger/OpenAPI spec
   - Code examples
   - Webhook support

