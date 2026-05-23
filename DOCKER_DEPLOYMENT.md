# LessenHub Docker Deployment Guide

## 🎉 Deployment Complete!

Your LessenHub application is now successfully deployed to Docker and running on your machine.

## 📍 Access Points

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5001
- **MongoDB**: localhost:27017

## 🚀 Quick Start

### Start Services
```bash
cd /Users/ilyasgu/Code/fontys/lessenhub
docker-compose up -d
```

### Stop Services
```bash
docker-compose down
```

### Stop Services and Remove Data
```bash
docker-compose down -v
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f mongodb
```

### Service Status
```bash
docker-compose ps
```

## 🏗️ Architecture

### Services

1. **MongoDB** (Database)
   - Image: mongo:7.0
   - Port: 27017 (internal)
   - Volume: `mongodb_data` (persistent storage)
   - Health: Auto-healing enabled

2. **.NET Backend** (API Server)
   - Image: lessenhub-backend
   - Dockerfile: `LessenHub.Backend/Dockerfile.prod`
   - Port: 5001 (external) → 8080 (internal)
   - Environment: Production
   - Depends on: MongoDB

3. **Next.js Frontend** (Web UI)
   - Image: lessenhub-frontend
   - Dockerfile: `LessenHub.Frontend/Dockerfile.prod`
   - Port: 3000
   - Depends on: Backend

### Network
- Type: Bridge (`lessenhub-network`)
- Allows internal communication between containers
- Frontend accesses backend via `http://backend:8080` (internal)
- External access via localhost ports

## 📦 Files Created

```
/
├── docker-compose.yml              # Main Docker Compose configuration
├── docker-deploy.sh               # Automated deployment script
├── DOCKER_DEPLOYMENT.md           # This file
├── .dockerignore                  # Exclude files from Docker builds
├── LessenHub.Backend/
│   └── Dockerfile.prod            # Production backend build
└── LessenHub.Frontend/
    └── Dockerfile.prod            # Production frontend build
```

## 🛠️ Manual Commands

### Build Images
```bash
docker-compose build
```

### Build Without Cache
```bash
docker-compose build --no-cache
```

### Restart Services
```bash
docker-compose restart
```

### Access Container Shell
```bash
# Backend
docker-compose exec backend bash

# Frontend
docker-compose exec frontend sh

# MongoDB
docker-compose exec mongodb mongosh
```

## 🔧 Configuration

### Backend (MongoDB)
The backend connects to MongoDB via the Docker network:
- Connection String: `mongodb://mongodb:27017/`
- Database: `lessenhubdb`
- These are set automatically via environment variables in docker-compose.yml

### Frontend
The frontend connects to the backend:
- API Base URL: `http://backend:8080` (internal Docker network)
- External access is configured in client-side code

## ⚠️ Troubleshooting

### Services Won't Start
```bash
# Check Docker daemon
docker ps

# View detailed logs
docker-compose logs -f

# Clear everything and restart
docker-compose down -v
docker system prune -a
docker-compose up -d
```

### MongoDB Connection Failed
```bash
# Check MongoDB health
docker-compose logs mongodb

# Access MongoDB shell
docker-compose exec mongodb mongosh lessenhubdb
```

### Backend Health Check
```bash
# The backend includes a health check
docker-compose ps
# Look for "health: healthy" status
```

### Port Already in Use
```bash
# Find process using port (e.g., 5001)
lsof -i :5001

# Kill the process
kill -9 <PID>

# Or change ports in docker-compose.yml
```

### Frontend Connection Refused
```bash
# Ensure backend is running
docker-compose logs backend

# Check backend is healthy
docker-compose ps

# View frontend logs
docker-compose logs frontend
```

## 📊 Monitoring

### View All Logs
```bash
docker-compose logs -f --all
```

### View Last N Lines
```bash
docker-compose logs --tail=50
```

### Follow Specific Service
```bash
docker-compose logs -f backend
```

## 🧹 Cleanup

### Remove Stopped Containers
```bash
docker container prune
```

### Remove Unused Images
```bash
docker image prune
```

### Remove Unused Volumes
```bash
docker volume prune
```

### Full Cleanup
```bash
docker system prune -a --volumes
```

## 💾 Data Persistence

Your MongoDB data is stored in the `mongodb_data` volume and persists across container restarts. To completely reset the database:

```bash
docker-compose down -v
docker-compose up -d
```

## 🔐 Security Notes

- MongoDB is exposed on port 27017 locally (bind to localhost only)
- The application stores connection strings with `localhost:27017` internally
- For production deployment, consider:
  - Using environment secrets for sensitive data
  - Restricting port access with firewalls
  - Using authentication for MongoDB
  - Implementing API authentication

## 🐛 Debugging

### Check Container Logs
```bash
docker-compose logs <service-name>
```

### Enter Container
```bash
docker-compose exec <service-name> bash
```

### Check Network
```bash
docker network ls
docker network inspect lessenhub_lessenhub-network
```

### Check Volumes
```bash
docker volume ls
docker volume inspect lessenhub_mongodb_data
```

## 📝 Environment Variables

Currently configured via `docker-compose.yml`:
- `ASPNETCORE_ENVIRONMENT=Production` (Backend)
- `ASPNETCORE_URLS=http://+:8080` (Backend)
- `MongoDB__ConnectionString=mongodb://mongodb:27017/` (Backend)
- `MongoDB__DatabaseName=lessenhubdb` (Backend)
- `NEXT_PUBLIC_API_URL=http://backend:8080` (Frontend)

To modify, edit `docker-compose.yml` and restart:
```bash
docker-compose restart
```

## 🎯 Next Steps

1. **Access the Frontend**: Open http://localhost:3000 in your browser
2. **Check Backend**: Visit http://localhost:5001 (check if API endpoints are available)
3. **Verify MongoDB**: 
   ```bash
   docker-compose exec mongodb mongosh lessenhubdb
   ```
4. **Review Logs**: 
   ```bash
   docker-compose logs -f
   ```

## 📞 Support

For issues with:
- **Docker**: Check Docker Desktop logs
- **Backend**: `docker-compose logs backend`
- **Frontend**: `docker-compose logs frontend`
- **Database**: `docker-compose logs mongodb`

## Version Info

- Docker Compose: 3.8+
- MongoDB: 7.0
- .NET: 10.0
- Node.js: 20 (for frontend builds)
- Next.js: 16.0.1

