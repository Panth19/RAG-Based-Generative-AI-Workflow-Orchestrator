"""
Main FastAPI application for RAG Enterprise Platform.
"""

import os
import uuid
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, UploadFile, File, HTTPException, Request, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel
from dotenv import load_dotenv
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from .models import (
    ChatRequest,
    ChatResponse,
    UploadResponse,
    ProcessingStatus,
    EvalHistoryResponse,
    SystemStats
)
from .services.ingestion import ingestion_service
from .services.chat_history import chat_history_service
from .services.agent import run_agent

load_dotenv()

# Rate limiter - 10 requests per minute per IP
limiter = Limiter(key_func=get_remote_address)

# Application start time for uptime tracking
APP_START_TIME = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    global APP_START_TIME
    from datetime import datetime
    APP_START_TIME = datetime.now()
    print("RAG Enterprise Platform started")
    yield
    print("RAG Enterprise Platform shutting down")


# Create FastAPI app
app = FastAPI(
    title="RAG Enterprise Platform API",
    description="Multi-LLM RAG system with intelligent routing",
    version="1.0.0",
    lifespan=lifespan
)

# Add rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:8080",
        "https://*.vercel.app",
        "*"  # For development - remove in production
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# In-memory processing status (use Redis in production)
processing_status = {}


@app.get("/")
@limiter.limit("30/minute")
async def root(request: Request):
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "RAG Enterprise Platform API",
        "version": "1.0.0"
    }


@app.get("/health")
async def health_check():
    """Detailed health check."""
    from datetime import datetime
    
    uptime = ""
    if APP_START_TIME:
        delta = datetime.now() - APP_START_TIME
        hours, remainder = divmod(int(delta.total_seconds()), 3600)
        minutes, seconds = divmod(remainder, 60)
        uptime = f"{hours}h {minutes}m {seconds}s"
    
    return {
        "status": "healthy",
        "uptime": uptime,
        "environment": os.getenv("ENVIRONMENT", "development")
    }


@app.post("/chat")
@limiter.limit("10/minute")
async def chat(request: Request, chat_request: ChatRequest):
    """Process a chat message through the RAG agent."""
    try:
        result = await run_agent(
            query=chat_request.message,
            conversation_id=chat_request.conversation_id
        )
        
        # Save user message
        await _save_message_safe(
            conversation_id=chat_request.conversation_id,
            role="user",
            content=chat_request.message
        )
        
        # Save assistant message
        await _save_message_safe(
            conversation_id=chat_request.conversation_id,
            role="assistant",
            content=result["answer"],
            sources=result.get("sources", []),
            confidence=result.get("confidence"),
            router_decision=result.get("router_decision")
        )
        
        return ChatResponse(
            answer=result["answer"],
            sources=result.get("sources", []),
            confidence=result.get("confidence", 0.0),
            router_decision=result.get("router_decision", "unknown")
        )
        
    except Exception as e:
        print(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing chat: {str(e)}")


@app.post("/chat/stream")
@limiter.limit("10/minute")
async def chat_stream(request: Request, chat_request: ChatRequest):
    """Process a chat message with streaming response."""
    async def generate_stream():
        try:
            result = await run_agent(
                query=chat_request.message,
                conversation_id=chat_request.conversation_id
            )
            
            # Save messages
            await _save_message_safe(
                conversation_id=chat_request.conversation_id,
                role="user",
                content=chat_request.message
            )
            
            # Stream the response token by token (simulated)
            answer = result["answer"]
            for char in answer:
                yield f"data: {repr({'token': char})}\n\n"
            
            # Send metadata
            metadata = {
                "sources": result.get("sources", []),
                "confidence": result.get("confidence", 0.0),
                "router_decision": result.get("router_decision")
            }
            yield f"data: {repr(metadata)}\n\n"
            yield "data: [DONE]\n\n"
            
            # Save assistant message
            await _save_message_safe(
                conversation_id=chat_request.conversation_id,
                role="assistant",
                content=answer,
                sources=result.get("sources", []),
                confidence=result.get("confidence"),
                router_decision=result.get("router_decision")
            )
            
        except Exception as e:
            yield f"data: {repr({'error': str(e)})}\n\n"
            yield "data: [DONE]\n\n"
    
    return StreamingResponse(
        generate_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@app.get("/history/{conversation_id}")
@limiter.limit("30/minute")
async def get_history(request: Request, conversation_id: str):
    """Get chat history for a conversation."""
    try:
        history = chat_history_service.get_history(conversation_id)
        return {"conversation_id": conversation_id, "messages": history}
    except Exception as e:
        print(f"History error: {e}")
        return {"conversation_id": conversation_id, "messages": []}


@app.post("/upload")
@limiter.limit("5/minute")
async def upload_file(request: Request, file: UploadFile = File(...)):
    """Upload and process a document."""
    try:
        # Validate file type
        allowed_types = [
            "application/pdf",
            "text/plain",
            "text/markdown",
            "text/csv",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ]
        
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail="File type not supported. Please upload PDF, TXT, MD, CSV, or DOCX files."
            )
        
        # Read file content
        content = await file.read()
        
        # Validate file size (50MB max)
        if len(content) > 50 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File size exceeds 50MB limit")
        
        # Generate file ID
        file_id = str(uuid.uuid4())
        processing_status[file_id] = {
            "status": "processing",
            "progress": 50,
            "message": "Processing document..."
        }
        
        # Process document
        result = await ingestion_service.process_document(
            file_content=content,
            filename=file.filename,
            file_type=file.content_type
        )
        
        processing_status[file_id] = {
            "status": "completed",
            "progress": 100,
            "message": "Document processed successfully"
        }
        
        return UploadResponse(
            file_url=result["s3_url"],
            file_id=result["file_id"],
            message=f"Document processed successfully. {result['chunks_count']} chunks created."
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Upload error: {e}")
        if 'file_id' in locals():
            processing_status[file_id] = {
                "status": "failed",
                "progress": 0,
                "message": str(e)
            }
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")


@app.get("/upload/status/{file_id}")
async def get_upload_status(file_id: str):
    """Check processing status for an upload."""
    status = processing_status.get(file_id)
    
    if not status:
        return ProcessingStatus(
            file_id=file_id,
            status="unknown",
            progress=0,
            message="No status found for this file"
        )
    
    return ProcessingStatus(
        file_id=file_id,
        status=status["status"],
        progress=status["progress"],
        message=status["message"]
    )


@app.get("/admin/metrics")
async def get_metrics():
    """Get evaluation metrics."""
    try:
        # In production, load from eval_results.json
        import json
        eval_file = os.path.join(os.path.dirname(__file__), "..", "..", "evaluation", "eval_results.json")
        
        if os.path.exists(eval_file):
            with open(eval_file, 'r') as f:
                data = json.load(f)
                return EvalHistoryResponse(
                    metrics=data.get("metrics", []),
                    latest=data.get("latest")
                )
        
        # Return empty if no evaluation data
        return EvalHistoryResponse(metrics=[], latest=None)
        
    except Exception as e:
        print(f"Metrics error: {e}")
        return EvalHistoryResponse(metrics=[], latest=None)


@app.post("/admin/evaluate")
async def run_evaluation():
    """Trigger a new RAGAS evaluation."""
    try:
        # This would trigger the evaluation script
        # For now, return a placeholder response
        return {
            "status": "started",
            "message": "Evaluation started. Results will be available shortly."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error running evaluation: {str(e)}")


@app.get("/admin/stats")
async def get_system_stats():
    """Get system statistics."""
    from datetime import datetime
    
    uptime = "0h 0m"
    if APP_START_TIME:
        delta = datetime.now() - APP_START_TIME
        hours, remainder = divmod(int(delta.total_seconds()), 3600)
        minutes, _ = divmod(remainder, 60)
        uptime = f"{hours}h {minutes}m"
    
    return SystemStats(
        total_documents=0,  # Would query from DB
        total_conversations=0,
        total_messages=chat_history_service.get_message_count(),
        uptime=uptime,
        last_evaluation=None
    )


async def _save_message_safe(
    conversation_id: str,
    role: str,
    content: str,
    sources: list = None,
    confidence: float = None,
    router_decision: str = None
):
    """Safely save a message, catching any errors."""
    try:
        chat_history_service.save_message(
            conversation_id=conversation_id,
            role=role,
            content=content,
            sources=sources,
            confidence=confidence,
            router_decision=router_decision
        )
    except Exception as e:
        print(f"Error saving message: {e}")


# Lambda handler using Mangum
try:
    from mangum import Mangum
    lambda_handler = Mangum(app)
except ImportError:
    lambda_handler = None
