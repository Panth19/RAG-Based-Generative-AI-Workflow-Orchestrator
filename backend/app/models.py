from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from enum import Enum


class RouterDecision(str, Enum):
    SEARCH = "search"
    DIRECT = "direct"
    COMPLEX = "complex"


class ChatMessage(BaseModel):
    role: str = Field(..., description="Message role: 'user' or 'assistant'")
    content: str = Field(..., description="Message content")
    timestamp: datetime = Field(default_factory=datetime.now)
    sources: List[str] = Field(default_factory=list)
    confidence: Optional[float] = None


class ChatRequest(BaseModel):
    message: str = Field(..., description="User message")
    conversation_id: str = Field(..., description="Conversation identifier")


class ChatResponse(BaseModel):
    answer: str = Field(..., description="Generated answer")
    sources: List[str] = Field(default_factory=list, description="Source documents")
    confidence: float = Field(default=0.0, description="Confidence score")
    router_decision: str = Field(default="direct", description="Router decision")


class AgentState(BaseModel):
    messages: List[ChatMessage] = Field(default_factory=list)
    context: List[str] = Field(default_factory=list, description="Retrieved context documents")
    router_decision: str = Field(default="", description="Router decision")
    conversation_id: str = Field(default="", description="Conversation ID")
    query: str = Field(default="", description="Current user query")


class UploadResponse(BaseModel):
    file_url: str = Field(..., description="S3 file URL")
    file_id: str = Field(..., description="Unique file identifier")
    message: str = Field(..., description="Status message")


class ProcessingStatus(BaseModel):
    file_id: str
    status: str  # pending, processing, completed, failed
    progress: int = 0
    message: str = ""


class VectorDocument(BaseModel):
    id: str
    text: str
    metadata: dict = Field(default_factory=dict)


class EvaluationMetrics(BaseModel):
    faithfulness: float
    answer_relevance: float
    context_precision: float
    overall_score: float
    timestamp: datetime = Field(default_factory=datetime.now)


class EvalHistoryResponse(BaseModel):
    metrics: List[EvaluationMetrics] = Field(default_factory=list)
    latest: Optional[EvaluationMetrics] = None


class SystemStats(BaseModel):
    total_documents: int = 0
    total_conversations: int = 0
    total_messages: int = 0
    uptime: str = "0h 0m"
    last_evaluation: Optional[datetime] = None
