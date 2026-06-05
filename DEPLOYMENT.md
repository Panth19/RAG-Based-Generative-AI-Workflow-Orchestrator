# RAG Enterprise Platform - Deployment Guide

This guide provides step-by-step instructions for deploying the RAG Enterprise Platform to AWS and Vercel.

---

## Table of Contents

1. [Phase 0: Account Setup & Security Configuration](#phase-0-account-setup--security-configuration)
2. [Phase 1: Project Setup](#phase-1-project-setup)
3. [Phase 2: AWS Infrastructure Deployment](#phase-2-aws-infrastructure-deployment)
4. [Phase 3: Backend Deployment](#phase-3-backend-deployment)
5. [Phase 4: Frontend Deployment](#phase-4-frontend-deployment)
6. [Phase 5: CI/CD Pipeline Setup](#phase-5-cicd-pipeline-setup)
7. [Phase 6: Monitoring & Verification](#phase-6-monitoring--verification)
8. [Troubleshooting](#troubleshooting)

---

## Phase 0: Account Setup & Security Configuration

### AWS Account Configuration

1. **Create AWS Account**
   - Go to https://aws.amazon.com/
   - Click "Create an AWS Account"
   - Follow the registration process

2. **Set Up Billing Alarm**
   - Go to AWS Billing Dashboard
   - Navigate to "Budgets" → "Create Budget"
   - Choose "Cost budget"
   - Set budget amount: $0.01
   - Set email for notifications
   - This ensures you're alerted before any charges

3. **Create IAM User**
   - Go to IAM Console → Users → Create User
   - Username: `rag-enterprise-deployer`
   - Enable "Programmatic access"
   - Attach policies:
     - `AWSLambda_FullAccess`
     - `AmazonS3_FullAccess`
     - `AmazonDynamoDB_FullAccess`
     - `CloudWatchFullAccess`
     - `AmazonEC2ContainerRegistryFullAccess`
     - `AWSCloudFormationFullAccess`
   - Save the Access Key ID and Secret Access Key

4. **Select Region**
   - Choose a region close to you (e.g., `us-east-1`)
   - Ensure all services (Lambda, S3, DynamoDB) are in the same region

### API Key Acquisition (Free Tiers)

1. **Groq**
   - Go to https://console.groq.com/
   - Create an account
   - Navigate to "API Keys"
   - Generate a new API key
   - Save the key
   - Note: Rate limit is ~30 requests/minute

2. **Google AI Studio (Gemini)**
   - Go to https://aistudio.google.com/
   - Sign in with your Google account
   - Click "Get API key"
   - Create a new API key
   - Save the key
   - Free tier: 60 requests/minute

3. **Pinecone**
   - Go to https://www.pinecone.io/
   - Create an account
   - Choose "Starter (Free)" plan
   - Create a new Index:
     - Name: `rag-enterprise-index`
     - Dimension: `768`
     - Metric: `cosine`
   - Save the API Key and Environment URL

### GitHub Repository Setup

1. **Create Repository**
   - Go to GitHub and create a new private repository
   - Name: `rag-enterprise-platform`
   - Initialize with `.gitignore`

2. **Configure Secrets**
   - Go to Repository → Settings → Secrets and Variables → Actions
   - Add the following secrets:
     ```
     AWS_ACCESS_KEY_ID: <your-aws-access-key>
     AWS_SECRET_ACCESS_KEY: <your-aws-secret-key>
     AWS_REGION: us-east-1
     GROQ_API_KEY: <your-groq-key>
     GOOGLE_API_KEY: <your-google-key>
     PINECONE_API_KEY: <your-pinecone-key>
     PINECONE_INDEX_NAME: rag-enterprise-index
     VERCEL_TOKEN: <your-vercel-token>
     VERCEL_ORG_ID: <your-vercel-org-id>
     VERCEL_PROJECT_ID: <your-vercel-project-id>
     API_GATEWAY_URL: <will-fill-after-deployment>
     ```

---

## Phase 1: Project Setup

### Clone and Setup

```bash
# Clone the repository
git clone https://github.com/your-org/rag-enterprise-platform.git
cd rag-enterprise-platform

# Create virtual environment for backend
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install backend dependencies
pip install -r requirements.txt

# Return to root
cd ..

# Install frontend dependencies
npm install
```

### Configure Environment Variables

```bash
# Backend environment
cp backend/.env.example backend/.env

# Edit backend/.env with your values:
# AWS_ACCESS_KEY_ID=your_key
# AWS_SECRET_ACCESS_KEY=your_secret
# AWS_REGION=us-east-1
# GROQ_API_KEY=your_groq_key
# GOOGLE_API_KEY=your_google_key
# PINECONE_API_KEY=your_pinecone_key
# PINECONE_INDEX_NAME=rag-enterprise-index
```

### Local Testing

```bash
# Start backend
cd backend
uvicorn app.main:app --reload --port 8000

# In another terminal, start frontend
cd frontend  # or root for React
npm run dev
```

---

## Phase 2: AWS Infrastructure Deployment

### Option A: Using AWS SAM (Recommended)

1. **Install AWS SAM CLI**
   ```bash
   # macOS
   brew install aws-sam-cli

   # Windows
   msiexec.exe /i https://github.com/aws/aws-sam-cli/releases/latest/download/AWS_SAM_CLI_64_PY3.msi

   # Linux
   pip install aws-sam-cli
   ```

2. **Configure AWS CLI**
   ```bash
   aws configure
   # Enter your AWS Access Key, Secret Key, Region, and output format (json)
   ```

3. **Deploy Infrastructure**
   ```bash
   cd infrastructure
   sam build
   sam deploy --guided
   ```

4. **Follow the prompts**
   - Stack Name: `rag-enterprise-stack`
   - AWS Region: `us-east-1`
   - Confirm changes before deploy: `Y`
   - Allow SAM CLI IAM role creation: `Y`
   - Save arguments to samconfig.toml: `Y`

5. **Note the outputs**
   - API Gateway URL
   - S3 Bucket Name
   - DynamoDB Table Name
   - Lambda Function Name

### Option B: Using AWS Console

1. **Create S3 Bucket**
   - Go to S3 Console → Create Bucket
   - Bucket name: `rag-enterprise-documents-<account-id>`
   - Enable Versioning
   - Block all public access
   - Create

2. **Create DynamoDB Table**
   - Go to DynamoDB Console → Create Table
   - Table name: `rag-enterprise-chat-history`
   - Partition key: `conversation_id` (String)
   - Sort key: `timestamp` (Number)
   - Create

3. **Create ECR Repository**
   - Go to ECR Console → Create Repository
   - Repository name: `rag-enterprise`
   - Create

4. **Create Lambda Function**
   - Go to Lambda Console → Create Function
   - Function name: `rag-enterprise-api`
   - Runtime: Python 3.11
   - Architecture: x86_64
   - Memory: 1024 MB
   - Timeout: 30 seconds
   - Add environment variables (from .env)
   - Create

5. **Create API Gateway**
   - Go to API Gateway Console → Create API
   - Type: HTTP API
   - Create integration → Lambda
   - Select your Lambda function
   - Enable CORS
   - Deploy

---

## Phase 3: Backend Deployment

### Build and Push Docker Image

```bash
# Navigate to backend directory
cd backend

# Configure AWS ECR login
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

# Build Docker image
docker build -t rag-enterprise .

# Tag the image
docker tag rag-enterprise:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/rag-enterprise:latest
docker tag rag-enterprise:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/rag-enterprise:$(git rev-parse HEAD)

# Push to ECR
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/rag-enterprise:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/rag-enterprise:$(git rev-parse HEAD)
```

### Update Lambda Function

```bash
# Update Lambda to use new image
aws lambda update-function-code \
  --function-name rag-enterprise-api \
  --image-uri <account-id>.dkr.ecr.us-east-1.amazonaws.com/rag-enterprise:latest

# Set environment variables
aws lambda update-function-configuration \
  --function-name rag-enterprise-api \
  --environment "Variables={
    AWS_ACCESS_KEY_ID=<key>,
    AWS_SECRET_ACCESS_KEY=<secret>,
    AWS_REGION=us-east-1,
    GROQ_API_KEY=<groq-key>,
    GOOGLE_API_KEY=<google-key>,
    PINECONE_API_KEY=<pinecone-key>,
    PINECONE_INDEX_NAME=rag-enterprise-index,
    S3_BUCKET_NAME=<bucket-name>,
    DYNAMODB_TABLE_NAME=rag-enterprise-chat-history
  }"
```

---

## Phase 4: Frontend Deployment

### Option A: Vercel (Recommended)

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Initialize Vercel Project**
   ```bash
   cd frontend  # or root
   vercel init
   ```

4. **Configure Environment**
   - Framework: Vite
   - Root Directory: `.`
   - Build Command: `npm run build`
   - Output Directory: `dist`

5. **Set Environment Variables**
   ```bash
   vercel env add VITE_API_URL
   # Enter your API Gateway URL
   ```

6. **Deploy**
   ```bash
   vercel --prod
   ```

### Option B: Manual Deployment

```bash
# Build the frontend
npm run build

# Upload dist folder to S3
aws s3 sync dist/ s3://your-frontend-bucket --delete

# Configure CloudFront (optional)
# ...
```

---

## Phase 5: CI/CD Pipeline Setup

### GitHub Actions Configuration

The CI/CD pipeline is already configured in `.github/workflows/deploy.yml`.

1. **Verify Secrets**
   - Go to Repository → Settings → Secrets and Variables → Actions
   - Ensure all secrets are configured

2. **Required Secrets**
   ```
   AWS_ACCESS_KEY_ID
   AWS_SECRET_ACCESS_KEY
   AWS_REGION
   GROQ_API_KEY
   GOOGLE_API_KEY
   PINECONE_API_KEY
   PINECONE_INDEX_NAME
   VERCEL_TOKEN
   VERCEL_ORG_ID
   VERCEL_PROJECT_ID
   API_GATEWAY_URL
   ```

3. **Push to Main**
   ```bash
   git add .
   git commit -m "Initial deployment"
   git push origin main
   ```

4. **Monitor Deployment**
   - Go to Repository → Actions
   - Watch the pipeline progress
   - All three jobs must pass:
     - Test & Evaluate
     - Deploy Backend
     - Deploy Frontend

---

## Phase 6: Monitoring & Verification

### Verify Deployment

1. **Test Backend API**
   ```bash
   # Health check
   curl https://<api-id>.execute-api.us-east-1.amazonaws.com/health

   # Test chat endpoint
   curl -X POST https://<api-id>.execute-api.us-east-1.amazonaws.com/chat \
     -H "Content-Type: application/json" \
     -d '{"message": "Hello", "conversation_id": "test-123"}'
   ```

2. **Test Frontend**
   - Open your Vercel URL
   - Upload a test document
   - Ask a question about the document
   - Verify the response includes sources

3. **Verify Costs**
   - Go to AWS Billing Dashboard
   - Should show $0.00 (free tier)
   - Check Groq/Gemini dashboards for usage

### CloudWatch Monitoring

1. **Enable Lambda Logging**
   - Go to Lambda → Configuration → Monitoring
   - Ensure "Active tracing" is enabled

2. **Create Error Alarm**
   - Go to CloudWatch → Alarms → Create Alarm
   - Select Lambda metric: Errors
   - Threshold: > 5 in 5 minutes
   - Add SNS notification

### Rate Limiting Verification

The backend implements rate limiting (10 requests/minute per IP).

```bash
# Test rate limiting
for i in {1..15}; do
  curl -s https://<api-id>.execute-api.us-east-1.amazonaws.com/health
  echo ""
done
# Should see 429 error after 10 requests
```

---

## Troubleshooting

### Common Issues

1. **Lambda Timeout**
   - Increase timeout in Lambda configuration (max 30s for free tier)
   - Optimize code to reduce cold start time

2. **CORS Errors**
   - Verify API Gateway CORS configuration
   - Check Lambda response headers

3. **DynamoDB Access Denied**
   - Ensure Lambda execution role has DynamoDB permissions
   - Check table name matches environment variable

4. **Pinecone Connection Issues**
   - Verify API key is correct
   - Check index name matches
   - Ensure dimension matches embedding model (768)

5. **Groq/Gemini Rate Limits**
   - Implement exponential backoff
   - Cache frequent queries
   - Monitor API usage dashboards

### Debug Commands

```bash
# Check Lambda logs
aws logs tail /aws/lambda/rag-enterprise-api --follow

# Test locally with Docker
docker-compose up

# Run evaluation
cd evaluation
python test_rag_quality.py
```

### Support

For issues, check:
1. AWS CloudWatch logs
2. GitHub Actions logs
3. Vercel deployment logs
4. Browser console for frontend errors

---

## Cost Summary (Free Tier)

| Service | Free Tier Limit | Notes |
|---------|-----------------|-------|
| AWS Lambda | 1M requests/month | 3.2M GB-seconds |
| AWS S3 | 5 GB storage | 20K GET, 2K PUT |
| DynamoDB | 25 GB, 25 RCU/WCU | On-demand mode |
| API Gateway | 1M HTTP calls | First 12 months |
| Groq | Rate limited | ~30 req/min |
| Google AI Studio | 60 RPM | Gemini-1.5-flash |
| Pinecone | 100K vectors | Starter plan |
| Vercel | 100GB bandwidth | Hobby tier |

**Total Expected Cost: $0.00** (when staying within free tiers)
