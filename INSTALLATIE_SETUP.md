# Installatie & Setup

## Hoe je het systeem lokaal en in omgevingen draait

---

## Vereisten (Software, Versies)

### Backend (.NET)

| Software | Versie | Download |
|----------|--------|----------|
| **.NET SDK** | 10.0.x | https://dotnet.microsoft.com/download |
| **.NET Runtime** | 10.0.x | Meegeleverd met SDK |
| **Visual Studio Code** (Optioneel) | Latest | https://code.visualstudio.com |
| **Visual Studio 2022** (Optioneel) | Community/Pro | https://visualstudio.microsoft.com |

**C# Extensions voor VS Code:**
- C# Dev Kit (Microsoft)
- .NET Runtime Installer

### Frontend (Next.js)

| Software | Versie | Download |
|----------|--------|----------|
| **Node.js** | 20.x LTS | https://nodejs.org |
| **npm** | 10.x | Meegeleverd met Node.js |
| **Git** | Latest | https://git-scm.com |

**npm packages** (zie package.json):
- Next.js 16.0.1
- React 19.2.0
- TypeScript 5.x
- Tailwind CSS 4.x
- ESLint 9.x

### Database

| Software | Versie | Download |
|----------|--------|----------|
| **MongoDB** | 7.0+ | https://www.mongodb.com/try/download/community |
| **MongoDB Shell (mongosh)** | Latest | https://www.mongodb.com/try/download/shell |

### Container & Deployment (Optioneel)

| Software | Versie | Download |
|----------|--------|----------|
| **Docker Desktop** | Latest | https://www.docker.com/products/docker-desktop |
| **Docker Compose** | v2.x+ | Meegeleverd met Docker Desktop |

### Authenticatie (SurfConext)

Voor development/production:
- SurfConext test account (GÉEN installatie nodig)
- OpenID Connect client credentials (zie Configuratie)

### Besturingssysteem Ondersteuning

- **macOS:** Alle tools beschikbaar via Homebrew
- **Windows:** Native support via installers, WSL2 optioneel
- **Linux:** Volledig ondersteund (Debian/Ubuntu recommended)

---

## Installatiestappen

### Stap 1: Vereisten Installeren

#### macOS (via Homebrew):
```bash
# Homebrew installeren (indien nodig)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# .NET SDK
brew install dotnet

# Node.js
brew install node@20

# MongoDB (optioneel, alleen voor lokale DB zonder Docker)
brew install mongodb-community

# Docker Desktop (optioneel)
brew install --cask docker
```

#### Windows:
1. **Download .NET SDK 10.0** van https://dotnet.microsoft.com/download
2. **Download Node.js 20 LTS** van https://nodejs.org
3. **Download Docker Desktop** (optioneel) van https://docker.com
4. Voer alle installers uit en volg de wizard

#### Linux (Ubuntu/Debian):
```bash
# .NET SDK
wget https://dot.net/v1/dotnet-install.sh -O dotnet-install.sh
chmod +x ./dotnet-install.sh
./dotnet-install.sh --version 10.0

# Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# MongoDB
sudo apt-get install -y mongodb

# Docker (optioneel)
sudo apt-get install -y docker.io docker-compose
```

### Stap 2: Repository Clonen

```bash
# Clone the repository
git clone https://github.com/your-org/lessenhub.git
cd lessenhub

# Verify structure
ls -la
# Should show: LessenHub.Backend/, LessenHub.Frontend/, docker-compose.yml, etc.
```

### Stap 3: Backend Setup

```bash
cd LessenHub.Backend

# Restore NuGet packages
dotnet restore

# Create user secrets for local development
dotnet user-secrets init
dotnet user-secrets set "SurfConext:ClientSecret" "CclDY5V6oawXgmuBF6hw"

# (Optional) Setup local MongoDB
# Ensure MongoDB is running on localhost:27017
```

**appsettings.Development.json** (automatisch gegenereerd):
```json
{
  "MongoDB": {
    "ConnectionString": "mongodb://localhost:27017/",
    "DatabaseName": "lessenhubdb"
  },
  "SurfConext": {
    "Authority": "https://connect.test.surfconext.nl",
    "ClientId": "dev.opsnederland.nl",
    "ClientSecret": "*** (via User Secrets) ***"
  },
  "Frontend": {
    "Url": "https://localhost:3000"
  }
}
```

### Stap 4: Frontend Setup

```bash
cd LessenHub.Frontend

# Install dependencies
npm install

# Verify installation
npm list next react

# Create .env.local (optional for local development)
echo 'NEXT_PUBLIC_API_URL=http://localhost:7207' > .env.local
echo 'NEXT_PUBLIC_BACKEND_URL=http://localhost:7207' >> .env.local
```

### Stap 5: MongoDB Setup (Lokaal)

**Optie A: Native MongoDB (macOS/Linux):**
```bash
# Start MongoDB service
brew services start mongodb-community

# Verify it's running
mongosh localhost:27017

# Create database
> use lessenhubdb
> db.createCollection("docenten")
> db.createCollection("lessenseries")
> db.createCollection("lessen")
```

**Optie B: Docker MongoDB:**
```bash
docker run -d \
  --name lessenhub-mongodb \
  -p 27017:27017 \
  -e MONGO_INITDB_DATABASE=lessenhubdb \
  mongo:7.0
```

**Optie C: Docker Compose (alles inclusief - AANBEVOLEN):**
```bash
# Ga terug naar project root
cd ../
docker-compose up -d
```

---

## Build & Run Instructies

### Development Modus (Lokaal)

#### Backend - Optie 1: dotnet watch (AANBEVOLEN)
```bash
cd LessenHub.Backend

# Watch mode - automatically restarts on file changes
dotnet watch run --project LessenHub.Backend.csproj

# Output:
# info: Microsoft.Hosting.Lifetime[14]
#       Now listening on: https://localhost:7207
```

**Endpoints beschikbaar:**
- API: https://localhost:7207
- Health: https://localhost:7207/health
- OpenAPI: https://localhost:7207/openapi/v1.json

#### Backend - Optie 2: Normale build & run
```bash
cd LessenHub.Backend

# Build
dotnet build

# Run
dotnet run

# Of beide tegelijk:
dotnet run --configuration Debug
```

#### Backend - Optie 3: VS Code/Visual Studio
1. Open workspace: `LessenHub.slnx`
2. F5 of "Run" knop → Start debugging
3. Kies profiel: `https` of `Container (Dockerfile)`

#### Frontend - Development
```bash
cd LessenHub.Frontend

# Development server met hot reload
npm run dev

# Output:
# ▲ Next.js 16.0.1
# - Local:        http://localhost:3000
```

**In browser openen:** http://localhost:3000

#### Frontend - Production Build (Lokaal)
```bash
cd LessenHub.Frontend

# Bouw
npm run build

# Start production server
npm run start

# Beschikbaar op: http://localhost:3000
```

### Build Artefacten

**Backend:**
```
LessenHub.Backend/
├── bin/
│   ├── Debug/net10.0/
│   │   └── LessenHub.Backend
│   └── Release/net10.0/
│       └── LessenHub.Backend
└── obj/
    └── Build outputs
```

**Frontend:**
```
LessenHub.Frontend/
├── .next/              # Build output
│   ├── server/
│   └── static/
└── out/                # Static export (indien npm run export)
```

### VS Code Tasks

Indien `.vscode/tasks.json` geconfigureerd:
```bash
# Start backend
Ctrl+Shift+B → "build" → Build LessenHub.Backend

# Start backend in watch mode
Ctrl+Shift+B → "watch" → Watch LessenHub.Backend
```

---

## Omgevingen (DEV / PROD)

### Development Environment (Lokaal)

**Configuratie:** `appsettings.Development.json`

```json
{
  "ASPNETCORE_ENVIRONMENT": "Development",
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Debug"
    }
  },
  "AllowedHosts": "*",
  "RequireHttpsMetadata": false,
  "MongoDB": {
    "ConnectionString": "mongodb://localhost:27017/",
    "DatabaseName": "lessenhubdb"
  },
  "SurfConext": {
    "Authority": "https://connect.test.surfconext.nl",
    "ClientId": "dev.opsnederland.nl",
    "ClientSecret": "*** (User Secrets) ***"
  },
  "Frontend": {
    "Url": "https://localhost:3000"
  }
}
```

**Karakteristieken:**
- ✅ Hot reload (watch mode)
- ✅ Verbose logging (Debug level)
- ✅ CORS permissief (localhost:3000)
- ✅ HTTP toegestaan
- ✅ MongoDB lokaal (docker/native)
- ✅ SurfConext test environment

**Starten:**
```bash
# Backend
dotnet watch run

# Frontend
npm run dev

# Beide tegelijk (in aparte terminals of tmux)
```

---

### Production Environment (Docker)

**Configuratie:** Environment variables in `docker-compose.yml`

```yaml
environment:
  ASPNETCORE_ENVIRONMENT: Production
  ASPNETCORE_URLS: http://+:8080
  ASPNETCORE_HTTPS_PORTS: 8081
  MongoDB__ConnectionString: "mongodb://mongodb:27017/"
  MongoDB__DatabaseName: lessenhubdb
  SurfConext__Authority: "https://connect.test.surfconext.nl"
  SurfConext__ClientId: "${SURFCONEXT_CLIENT_ID}"
  SurfConext__ClientSecret: "${SURFCONEXT_CLIENT_SECRET}"
  Frontend__Url: "http://localhost:3000"
```

**Karakteristieken:**
- ✅ Optimized builds
- ✅ Minimale logging (Warning level)
- ✅ HTTPS enforced (8081)
- ✅ MongoDB via Docker service
- ✅ Container networking
- ✅ Health checks enabled
- ✅ Volume persistence (MongoDB data)

**Starten:**
```bash
# Alles opstart
docker-compose up -d

# Status controleren
docker-compose ps

# Logs bekijken
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f mongodb

# Stoppen
docker-compose down

# Stoppen + data wissen
docker-compose down -v
```

**Toegangspunten:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:5001
- MongoDB: localhost:27017

---

### Staging Environment (Cloud - Geplande)

**Configuratie:** Via environment secrets/vault

```yaml
ASPNETCORE_ENVIRONMENT: Staging
MongoDB__ConnectionString: "mongodb+srv://user:pass@cluster.mongodb.net/"
MongoDB__DatabaseName: lessenhubdb-staging
SurfConext__Authority: "https://connect.test.surfconext.nl"
Frontend__Url: "https://staging.lessenhub.nl"
```

**Deployment:**
- Cloud provider: Azure/AWS/DigitalOcean
- Orchestration: Kubernetes (toekomstig)
- CI/CD: GitHub Actions

---

## Troubleshooting

### Backend Problemen

**❌ "MongoDB connection refused"**
```bash
# Controleer MongoDB status
mongosh localhost:27017

# Start MongoDB indien nodig
brew services start mongodb-community          # macOS
docker run -d -p 27017:27017 mongo:7.0       # Docker
```

**❌ "Port 7207 already in use"**
```bash
# Zoek proces op port
lsof -i :7207

# Kill process
kill -9 <PID>

# Of gebruik ander poort
dotnet run --urls=https://localhost:7208
```

**❌ "SurfConext ClientSecret not configured"**
```bash
# Set user secret
dotnet user-secrets set "SurfConext:ClientSecret" "your-secret"

# Verify
dotnet user-secrets list
```

### Frontend Problemen

**❌ "npm ERR! not found"**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

**❌ "Port 3000 already in use"**
```bash
# Gebruik ander poort
npm run dev -- -p 3001
```

### Docker Problemen

**❌ "docker: command not found"**
```bash
# Install Docker Desktop
brew install --cask docker

# Or start Docker Desktop app
open /Applications/Docker.app
```

**❌ "Container exited with code 1"**
```bash
# Bekijk logs
docker-compose logs -f <service-name>

# Rebuild image
docker-compose up -d --build
```

---

## Environment Checklist

Voordat je development start:

- [ ] .NET 10.0 SDK geïnstalleerd (`dotnet --version`)
- [ ] Node.js 20 geïnstalleerd (`node --version`)
- [ ] MongoDB draait (`mongosh localhost:27017`)
- [ ] Git repository gecloned
- [ ] Backend dependencies gerestored (`dotnet restore`)
- [ ] Frontend dependencies geïnstalleerd (`npm install`)
- [ ] User secrets geconfigureerd (`dotnet user-secrets list`)
- [ ] Poorten 3000, 7207, 27017 beschikbaar
- [ ] Kan naar https://localhost:7207 navigeren (backend)
- [ ] Kan naar http://localhost:3000 navigeren (frontend)

---

## Handige Commands

```bash
# Backend Development
dotnet watch run                          # Watch mode
dotnet build                              # Bouw alleen
dotnet clean                              # Schoon build output
dotnet test                               # Run tests (indien beschikbaar)

# Frontend Development
npm run dev                               # Development server
npm run build                             # Production build
npm run start                             # Start production build
npm run lint                              # Code linting

# Database
mongosh localhost:27017                   # MongoDB shell
use lessenhubdb                           # Switch database
db.docenten.find()                        # Query docenten

# Docker
docker-compose up -d                      # Start services
docker-compose down                       # Stop services
docker-compose ps                         # Service status
docker-compose logs -f <service>          # View logs

# Git
git clone <repo>                          # Clone repository
git pull                                  # Update code
git status                                # Check changes
```

---

## Performance Tips

### Backend Optimization
- Async/await voor database calls
- Caching voor frequently accessed data
- Connection pooling voor MongoDB
- Index queries in MongoDB

### Frontend Optimization
- Next.js image optimization
- Code splitting (automatic)
- CSS minification (Tailwind)
- Static generation waar mogelijk

### Database Optimization
- Create indexes op frequently queried fields
- Use pagination voor grote datasets
- Enable compression in MongoDB
- Regular backups (production)

---

# Systeemstatus

## Teststrategie
- Unit tests: niet aanwezig
- Integratietests: niet aanwezig
- End-to-end: handmatig via frontend + backend (lokaal of Docker)
- Aanbeveling: start met unit tests voor repositories (Mongo/InMemory) en controller-level tests met TestServer.

## Testdekking (globaal)
- Geautomatiseerde dekking: 0% (geen testprojecten gevonden)
- Verificatie gebeurt nu handmatig tijdens ontwikkeling en via lokale runs.

## Bekende technische schuld
- API’s gedeeltelijk onaf (Bijlage/Zoeken/Waarderen zonder implementatie)
- Validatie minimaal (alleen null-checks, geen model validation attributes)
- AuthZ ontbreekt (alleen OIDC login, geen role/claims checks per endpoint)
- Error handling generiek (catch-all zonder logging/telemetrie)
- PdfGeneratorService: logica voor AreaBreak heeft een bracket-issue waardoor een page break mogelijk altijd of nooit toegepast wordt.
- Mongo repositories zijn sync-blocking op async calls (`GetAwaiter().GetResult()`), kan thread starvation geven onder load.

## Openstaande bugs
- Niet vastgelegd in de codebase; geen issue tracker in repo.
- Potentieel: SurfConext callback URLs moeten overeenkomen met frontend URL in configuratie; anders login-loop.
- Potentieel: Onvoldoende CORS-whitelist voor andere omgevingen dan localhost.

## Beperkingen en risico’s
- Geen geautomatiseerde tests → regressierisico bij elke wijziging.
- Geen rate limiting/logging/observability → lastig bij incidenten.
- Afhankelijkheid van SurfConext testomgeving; productieconfig niet gevalideerd.
- MongoDB zonder schema- of indexbeheer; groeirisico op performance.
- Bijlage/Zoek/Waarderen functionaliteit ontbreekt → functionele hiaten.

