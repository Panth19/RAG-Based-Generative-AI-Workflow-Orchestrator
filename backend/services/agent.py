# ============================================================
# LangGraph Agent - Multi-LLM Routing State Machine
# ============================================================

import os
import json
from typing import TypedDict, Annotated, List, Literal
from dataclasses import dataclass

from langgraph.graph import StateGraph, END
from pydantic import BaseModel, Field

# ============================================================
# State Schema
# ============================================================

class SourceDocument(BaseModel):
    file_name: str
    page_number: int
    chunk_id: str
    content: str
    score: float

class RouterDecision(BaseModel):
    decision: Literal["search", "direct", "complex"]
    reasoning: str

class AgentResponse(BaseModel):
    answer: str
    sources: List[SourceDocument] = Field(default_factory=list)
    confidence: float = Field(ge=0.0, le=1.0)
    router_decision: RouterDecision

class AgentState(TypedDict):
    messages: Annotated[list, "Conversation messages"]
    context: Annotated[list, "Retrieved documents"]
    router_decision: Annotated[str, "Router's decision"]
    conversation_id: Annotated[str, "Current conversation ID"]
    query: Annotated[str, "Current user query"]
    response: Annotated[dict, "Final response"]

# ============================================================
# Router Node
# ============================================================

def router_node(state: AgentState) -> AgentState:
    """
    Route query to appropriate handler using Groq (Llama3-8b).
    - 'search': Requires document retrieval
    - 'direct': Simple query, no retrieval needed
    - 'complex': Requires multi-document analysis
    """
    query = state["query"]
    
    # In production: Use Groq Llama3-8b for fast routing
    # For now, simple keyword-based routing
    query_lower = query.lower()
    
    if any(word in query_lower for word in ["hello", "hi", "hey", "thanks", "math", "calculate"]):
        decision = "direct"
        reasoning = "Greeting or simple query detected, using direct response."
    elif any(word in query_lower for word in ["compare", "analyze", "multiple", "relationship", "complex"]):
        decision = "complex"
        reasoning = "Complex multi-document analysis required."
    else:
        decision = "search"
        reasoning = "Query requires document search for accurate response."
    
    return {
        **state,
        "router_decision": decision,
    }

# ============================================================
# Retriever Tool
# ============================================================

async def search_vector_store(query: str, top_k: int = 3) -> List[dict]:
    """
    Search Qdrant for relevant document chunks.
    1. Embed the query using Google Generative AI embeddings
    2. Query Qdrant with the embedding vector
    3. Return top-k results
    """
    # In production:
    # 1. Embed query with GoogleGenerativeAIEmbeddings (embedding-001)
    # 2. Query Qdrant with cosine similarity
    # 3. Return results with metadata
    
    # Mock results for development
    return [
        {
            "text": "The RAG architecture implements a router-based system for intelligent query handling.",
            "metadata": {
                "source_file_name": "architecture.pdf",
                "page_number": 1,
                "chunk_id": "chunk-001",
                "score": 0.94,
            },
        },
        {
            "text": "Groq is used for fast inference with Llama3 models, providing sub-second responses.",
            "metadata": {
                "source_file_name": "tech_stack.md",
                "page_number": 2,
                "chunk_id": "chunk-002",
                "score": 0.89,
            },
        },
        {
            "text": "Qdrant vector database stores embeddings with cosine similarity for efficient retrieval.",
            "metadata": {
                "source_file_name": "database.md",
                "page_number": 1,
                "chunk_id": "chunk-003",
                "score": 0.87,
            },
        },
    ]

# ============================================================
# Retriever Node
# ============================================================

async def retriever_node(state: AgentState) -> AgentState:
    """Retrieve relevant documents from vector store."""
    query = state["query"]
    context = await search_vector_store(query, top_k=3)
    return {**state, "context": context}

# ============================================================
# Generator Nodes (Multi-LLM)
# ============================================================

async def simple_generator_node(state: AgentState) -> AgentState:
    """
    Generate response using Groq (Llama3-70b) for standard queries.
    Fast inference, good for straightforward answers.
    """
    query = state["query"]
    context = state.get("context", [])
    
    # In production: Use Groq Llama3-70b
    # Prompt: "Answer using the provided context. Be concise and cite sources."
    
    context_text = "\n\n".join([doc["text"] for doc in context])
    
    # Mock response
    answer = f"Based on the retrieved documents: {context_text[:200]}..."
    
    sources = [
        SourceDocument(
            file_name=doc["metadata"]["source_file_name"],
            page_number=doc["metadata"]["page_number"],
            chunk_id=doc["metadata"]["chunk_id"],
            content=doc["text"],
            score=doc["metadata"]["score"],
        )
        for doc in context
    ]
    
    return {
        **state,
        "response": {
            "answer": answer,
            "sources": [s.model_dump() for s in sources],
            "confidence": 0.88,
        },
    }

async def complex_generator_node(state: AgentState) -> AgentState:
    """
    Generate response using Gemini-1.5-Flash for complex queries.
    Larger context window for multi-document analysis.
    """
    query = state["query"]
    context = state.get("context", [])
    
    # In production: Use Gemini-1.5-Flash
    # Prompt: "Perform deep analysis across multiple documents. Provide comprehensive insights."
    
    context_text = "\n\n".join([doc["text"] for doc in context])
    
    answer = (
        f"Deep analysis of the documents reveals: {context_text[:300]}... "
        "This analysis synthesizes information across multiple sources to provide "
        "a comprehensive understanding of the topic."
    )
    
    sources = [
        SourceDocument(
            file_name=doc["metadata"]["source_file_name"],
            page_number=doc["metadata"]["page_number"],
            chunk_id=doc["metadata"]["chunk_id"],
            content=doc["text"],
            score=doc["metadata"]["score"],
        )
        for doc in context
    ]
    
    return {
        **state,
        "response": {
            "answer": answer,
            "sources": [s.model_dump() for s in sources],
            "confidence": 0.92,
        },
    }

async def direct_generator_node(state: AgentState) -> AgentState:
    """Generate direct response without retrieval."""
    return {
        **state,
        "response": {
            "answer": "Hello! I'm the RAG Enterprise Platform assistant. How can I help you today?",
            "sources": [],
            "confidence": 0.95,
        },
    }

# ============================================================
# Validation Node
# ============================================================

async def validation_node(state: AgentState) -> AgentState:
    """Validate response format and retry if needed."""
    response = state.get("response", {})
    
    # Ensure response has required fields
    if "answer" not in response:
        response["answer"] = "I apologize, but I couldn't generate a proper response."
    if "sources" not in response:
        response["sources"] = []
    if "confidence" not in response:
        response["confidence"] = 0.5
    
    # Ensure confidence is in valid range
    response["confidence"] = max(0.0, min(1.0, response["confidence"]))
    
    return {**state, "response": response}

# ============================================================
# Router Decision Function
# ============================================================

def route_decision(state: AgentState) -> str:
    """Conditional edge: route based on router's decision."""
    decision = state.get("router_decision", "search")
    if decision == "direct":
        return "direct"
    elif decision == "complex":
        return "complex"
    else:
        return "search"

# ============================================================
# Build LangGraph
# ============================================================

def build_agent_graph() -> StateGraph:
    """Build the LangGraph state machine."""
    
    # Create graph
    graph = StateGraph(AgentState)
    
    # Add nodes
    graph.add_node("router", router_node)
    graph.add_node("retriever", retriever_node)
    graph.add_node("simple_generator", simple_generator_node)
    graph.add_node("complex_generator", complex_generator_node)
    graph.add_node("direct_generator", direct_generator_node)
    graph.add_node("validator", validation_node)
    
    # Set entry point
    graph.set_entry_point("router")
    
    # Add conditional edges from router
    graph.add_conditional_edges(
        "router",
        route_decision,
        {
            "search": "retriever",
            "complex": "retriever",
            "direct": "direct_generator",
        },
    )
    
    # After retrieval, route to appropriate generator
    graph.add_conditional_edges(
        "retriever",
        lambda state: "complex" if state.get("router_decision") == "complex" else "simple",
        {
            "simple": "simple_generator",
            "complex": "complex_generator",
        },
    )
    
    # All generators go to validator
    graph.add_edge("simple_generator", "validator")
    graph.add_edge("complex_generator", "validator")
    graph.add_edge("direct_generator", "validator")
    
    # Validator goes to END
    graph.add_edge("validator", END)
    
    return graph.compile()

# ============================================================
# Singleton (compiled outside request handler for Lambda)
# ============================================================

agent_graph = build_agent_graph()
