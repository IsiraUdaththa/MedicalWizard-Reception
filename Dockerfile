# =============================================================
# Stage 1: Build React Frontend
# =============================================================
FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# =============================================================
# Stage 2: Build & Publish .NET Backend
# =============================================================
FROM mcr.microsoft.com/dotnet/sdk:10.0-alpine AS backend-builder
WORKDIR /app

# Restore dependencies
COPY backend/Reception.Api/*.csproj ./backend/Reception.Api/
RUN dotnet restore backend/Reception.Api/Reception.Api.csproj

# Copy source and publish release build
COPY backend/ ./backend/
WORKDIR /app/backend/Reception.Api
RUN dotnet publish -c Release -o /app/publish

# Copy compiled React frontend assets directly into wwwroot
COPY --from=frontend-builder /app/frontend/dist /app/publish/wwwroot

# =============================================================
# Stage 3: Final Production Runtime Image
# =============================================================
FROM mcr.microsoft.com/dotnet/aspnet:10.0-alpine AS runtime
WORKDIR /app
COPY --from=backend-builder /app/publish .

ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production
EXPOSE 8080

ENTRYPOINT ["dotnet", "Reception.Api.dll"]
