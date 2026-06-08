# Infrastructure Configuration

This directory contains infrastructure-as-code configurations for deploying the RAG Enterprise Platform.

## Options

### 1. Docker Compose (Local Development)
See `docker-compose.yml` in the project root.

### 2. AWS Deployment
- Lambda function configuration
- API Gateway setup
- S3 bucket for document storage
- DynamoDB for chat history

### 3. Qdrant Cloud
- Managed Qdrant instance
- No infrastructure to manage

## Quick Commands

```bash
# Local development
docker compose up -d

# Stop services
docker compose down

# View logs
docker compose logs -f

# Rebuild
docker compose up --build -d
```
