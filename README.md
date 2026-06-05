# RAG Enterprise Platform

A production-ready Retrieval-Augmented Generation (RAG) platform with intelligent multi-LLM routing, built using FastAPI, LangGraph, Next.js, and AWS services.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │ Chat UI     │  │ File Upload │  │ Admin Dashboard         │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    API Gateway + Lambda                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   FastAPI Application                     │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │   │
│  │  │ Rate Limiter│  │ CORS        │  │ Auth Middleware  │ │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘ │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 LangGraph Agent                          │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐ │   │
│  │  │ Router   │  │Retriever │  │Simple    │  │Complex │ │   │
│  │  │ (Groq8b) │  │(Pinecone)│  │(Groq70b) │  │(Gemini)│ │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └────────┘ │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  AWS S3      │    │  DynamoDB    │    │  Pinecone    │
│  (Documents) │    │  (Chat Hist) │    │  (Vectors)   │
└──────────────┘    └──────────────┘    └──────────────┘
```

## Features

- **Multi-LLM Routing**: Intelligent query routing between Groq (fast) and Gemini (complex reasoning)
- **Document Ingestion**: PDF, TXT, MD, CSV, DOCX support with vector embeddings
- **Vector Search**: Pinecone-powered semantic search
- **Chat History**: DynamoDB persistence
- **Streaming Responses**: Server-Sent Events for real-time output
- **RAGAS Evaluation**: Automated quality metrics
- **CI/CD Pipeline**: GitHub Actions for testing and deployment

## Tech Stack

### Frontend
- React 18 with TypeScript
- Vite
- Tailwind CSS
- React Router
- Recharts (Admin Dashboard)
- Zustand (State Management)

### Backend
- Python 3.11
- FastAPI
- LangGraph (Agent Orchestration)
- LangChain
- Groq (Llama3-8b, Llama3-70b)
- Google Generative AI (Gemini-1.5-flash)
- Pinecone (Vector Database)

### AWS Services
- Lambda (Serverless Compute)
- S3 (Document Storage)
- DynamoDB (Chat History)
- API Gateway (HTTP API)
- ECR (Container Registry)
- CloudWatch (Monitoring)

## Project Structure

```
rag-enterprise-platform/
├── frontend/              # Next.js frontend (legacy)
├── backend/               # FastAPI backend
│   ├── app/
│   │   ├── main.py        # FastAPI application
│   │   ├── models.py      # Pydantic schemas
│   │   └── services/
│   │       ├── agent.py       # LangGraph agent
│   │       ├── ingestion.py   # Document processing
│   │       └── chat_history.py
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env
├── infrastructure/        # AWS SAM templates
├── evaluation/            # RAGAS evaluation scripts
├── .github/workflows/     # CI/CD pipeline
├── docker-compose.yml     # Local development
└── README.md
```

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 20+
- Docker (optional)
- AWS Account
- API Keys (Groq, Google, Pinecone)

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/rag-enterprise-platform.git
   cd rag-enterprise-platform
   ```

2. **Configure environment variables**
   ```bash
   cp backend/.env.example backend/.env
   # Edit backend/.env with your API keys
   ```

3. **Start with Docker Compose**
   ```bash
   docker-compose up
   ```

4. **Or run manually**
   ```bash
   # Backend
   cd backend
   python -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   uvicorn app.main:app --reload

   # Frontend
   npm install
   npm run dev
   ```

5. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000
   - Admin Dashboard: http://localhost:5173/admin

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Health check |
| `/health` | GET | Detailed health status |
| `/chat` | POST | Send chat message |
| `/chat/stream` | POST | Streaming chat response |
| `/history/{conversation_id}` | GET | Get chat history |
| `/upload` | POST | Upload document |
| `/upload/status/{file_id}` | GET | Check upload status |
| `/admin/metrics` | GET | Get evaluation metrics |
| `/admin/evaluate` | POST | Trigger RAGAS evaluation |
| `/admin/stats` | GET | System statistics |

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions.

### Quick Deploy

1. **Setup AWS resources**
   ```bash
   cd infrastructure
   sam deploy --guided
   ```

2. **Configure GitHub Secrets**
   - AWS_ACCESS_KEY_ID
   - AWS_SECRET_ACCESS_KEY
   - GROQ_API_KEY
   - GOOGLE_API_KEY
   - PINECONE_API_KEY
   - VERCEL_TOKEN

3. **Push to main branch**
   ```bash
   git push origin main
   ```

## Evaluation

Run the RAGAS evaluation suite:

```bash
cd evaluation
python test_rag_quality.py
```

Quality Gate:
- Context Precision must be ≥ 70%
- Failure blocks deployment

## Cost Optimization

This project is designed to stay within free tiers:

- **AWS**: Lambda free tier (1M requests/month), S3, DynamoDB on-demand
- **Groq**: Free API access with rate limits
- **Google AI Studio**: Gemini-1.5-flash free tier
- **Pinecone**: Starter plan (100K vectors)
- **Vercel**: Hobby tier

## Monitoring

- CloudWatch logs for Lambda
- Billing alarm at $0.01
- Error rate monitoring
- Rate limiting (10 req/min per IP)

## License

MIT
