"""
LangGraph agent workflow for multi-LLM routing and query processing.
"""

import os
import json
from typing import List, TypedDict, Annotated, Sequence
from typing_extensions import TypedDict

from langgraph.graph import StateGraph, END
from langchain_core.messages import HumanMessage, AIMessage, BaseMessage
from langchain_groq import ChatGroq
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from dotenv import load_dotenv

from .ingestion import ingestion_service
from .models import AgentState

load_dotenv()


class GraphState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], "The messages in the conversation"]
    context: List[str]
    router_decision: str
    conversation_id: str
    query: str


# Initialize LLMs
groq_llm_simple = ChatGroq(
    model="llama3-8b-8192",
    groq_api_key=os.getenv("GROQ_API_KEY"),
    temperature=0.3,
    max_tokens=1024
)

groq_llm_complex = ChatGroq(
    model="llama3-70b-8192",
    groq_api_key=os.getenv("GROQ_API_KEY"),
    temperature=0.3,
    max_tokens=2048
)

gemini_llm = ChatGoogleGenerativeAI(
    model="gemini-1.5-flash",
    google_api_key=os.getenv("GOOGLE_API_KEY"),
    temperature=0.3,
    max_tokens=4096
)


# Router Prompt
router_prompt = ChatPromptTemplate.from_messages([
    ("system", """You are a query router. Analyze the user query and decide the best route.

Routes:
- 'search': If the query requires searching through documents or knowledge base
- 'direct': If it's a greeting, simple math, or general question that doesn't need document search
- 'complex': If it requires complex reasoning, analysis of multiple documents, or multi-step reasoning

Respond with ONLY the route name (search, direct, or complex). No explanation needed."""),
    ("human", "{query}")
])


# Generator Prompts
simple_prompt = ChatPromptTemplate.from_messages([
    ("system", """You are a helpful AI assistant. Answer the user's question using the provided context if available.

IMPORTANT: You MUST respond with valid JSON in this exact format:
{{
    "answer": "Your answer here",
    "sources": ["source1", "source2"],
    "confidence": 0.85
}}

Context: {context}

Rules:
- If context is provided, use it to answer accurately
- Be concise and helpful
- Set confidence based on how certain you are (0.0 to 1.0)
- If you used context, list the sources"""),
    ("human", "{query}")
])

complex_prompt = ChatPromptTemplate.from_messages([
    ("system", """You are an advanced AI analyst. Perform deep analysis on the user's query using the provided context.

IMPORTANT: You MUST respond with valid JSON in this exact format:
{{
    "answer": "Your detailed analysis here",
    "sources": ["source1", "source2"],
    "confidence": 0.90
}}

Context: {context}

Rules:
- Provide comprehensive analysis
- Consider multiple perspectives
- Be thorough and detailed
- Set confidence based on completeness of context
- List all sources used"""),
    ("human", "{query}")
])


async def router_node(state: GraphState) -> dict:
    """Route the query to appropriate handler."""
    query = state["query"]
    
    try:
        chain = router_prompt | groq_llm_simple | StrOutputParser()
        decision = await chain.ainvoke({"query": query})
        decision = decision.strip().lower()
        
        # Validate decision
        if decision not in ["search", "direct", "complex"]:
            decision = "search"  # Default to search if uncertain
            
    except Exception as e:
        print(f"Router error: {e}")
        decision = "search"
    
    return {"router_decision": decision}


async def retriever_node(state: GraphState) -> dict:
    """Retrieve relevant documents from Pinecone."""
    query = state["query"]
    
    try:
        documents = await ingestion_service.search_similar(query, top_k=3)
        context = [doc["text"] for doc in documents]
        sources = [doc["source_file_name"] for doc in documents]
        
    except Exception as e:
        print(f"Retrieval error: {e}")
        context = []
        sources = []
    
    return {"context": context}


async def simple_generator_node(state: GraphState) -> dict:
    """Generate response using Groq (fast/simple queries)."""
    query = state["query"]
    context = state.get("context", [])
    context_text = "\n\n".join(context) if context else "No context available."
    
    try:
        chain = simple_prompt | groq_llm_simple | StrOutputParser()
        response = await chain.ainvoke({
            "query": query,
            "context": context_text
        })
        
        # Parse JSON response
        result = _parse_json_response(response)
        
    except Exception as e:
        print(f"Simple generator error: {e}")
        result = {
            "answer": f"I apologize, but I encountered an error processing your query. Please try again.",
            "sources": [],
            "confidence": 0.0
        }
    
    messages = state.get("messages", [])
    messages.append(AIMessage(content=result["answer"]))
    
    return {
        "messages": messages,
        "context": result.get("sources", [])
    }


async def complex_generator_node(state: GraphState) -> dict:
    """Generate response using Gemini (complex reasoning)."""
    query = state["query"]
    context = state.get("context", [])
    context_text = "\n\n".join(context) if context else "No context available."
    
    try:
        chain = complex_prompt | gemini_llm | StrOutputParser()
        response = await chain.ainvoke({
            "query": query,
            "context": context_text
        })
        
        # Parse JSON response
        result = _parse_json_response(response)
        
    except Exception as e:
        print(f"Complex generator error: {e}")
        result = {
            "answer": f"I apologize, but I encountered an error processing your complex query. Please try again.",
            "sources": [],
            "confidence": 0.0
        }
    
    messages = state.get("messages", [])
    messages.append(AIMessage(content=result["answer"]))
    
    return {
        "messages": messages,
        "context": result.get("sources", [])
    }


async def direct_generator_node(state: GraphState) -> dict:
    """Generate response for simple/direct queries without document search."""
    query = state["query"]
    
    try:
        response = await groq_llm_simple.ainvoke([
            ("system", "You are a helpful AI assistant. Respond concisely and accurately. Always respond with valid JSON: {\"answer\": \"your response\", \"sources\": [], \"confidence\": 0.95}"),
            ("human", query)
        ])
        
        result = _parse_json_response(response.content)
        
    except Exception as e:
        print(f"Direct generator error: {e}")
        result = {
            "answer": f"Hello! I'm here to help. Could you please rephrase your question?",
            "sources": [],
            "confidence": 0.5
        }
    
    messages = state.get("messages", [])
    messages.append(AIMessage(content=result["answer"]))
    
    return {"messages": messages}


def _parse_json_response(response: str) -> dict:
    """Parse JSON from LLM response with fallback."""
    try:
        # Try to extract JSON from the response
        if "```json" in response:
            json_str = response.split("```json")[1].split("```")[0].strip()
        elif "```" in response:
            json_str = response.split("```")[1].split("```")[0].strip()
        else:
            # Try to find JSON object in the response
            start = response.find("{")
            end = response.rfind("}") + 1
            if start != -1 and end != 0:
                json_str = response[start:end]
            else:
                json_str = response
        
        result = json.loads(json_str)
        
        # Validate required fields
        return {
            "answer": result.get("answer", response),
            "sources": result.get("sources", []),
            "confidence": min(max(result.get("confidence", 0.5), 0.0), 1.0)
        }
        
    except (json.JSONDecodeError, ValueError):
        # Fallback if JSON parsing fails
        return {
            "answer": response,
            "sources": [],
            "confidence": 0.5
        }


def _route_after_router(state: GraphState) -> str:
    """Determine route after router node."""
    decision = state.get("router_decision", "search")
    
    if decision == "search":
        return "retriever"
    elif decision == "complex":
        return "retriever"
    else:  # direct
        return "direct"


def _route_after_retriever(state: GraphState) -> str:
    """Determine route after retriever node."""
    decision = state.get("router_decision", "search")
    
    if decision == "complex":
        return "complex_generator"
    else:
        return "simple_generator"


# Build the graph
workflow = StateGraph(GraphState)

# Add nodes
workflow.add_node("router", router_node)
workflow.add_node("retriever", retriever_node)
workflow.add_node("simple_generator", simple_generator_node)
workflow.add_node("complex_generator", complex_generator_node)
workflow.add_node("direct", direct_generator_node)

# Set entry point
workflow.set_entry_point("router")

# Add conditional edges
workflow.add_conditional_edges(
    "router",
    _route_after_router,
    {
        "retriever": "retriever",
        "direct": "direct"
    }
)

workflow.add_conditional_edges(
    "retriever",
    _route_after_retriever,
    {
        "simple_generator": "simple_generator",
        "complex_generator": "complex_generator"
    }
)

# Add end edges
workflow.add_edge("simple_generator", END)
workflow.add_edge("complex_generator", END)
workflow.add_edge("direct", END)

# Compile the graph
agent_graph = workflow.compile()


async def run_agent(query: str, conversation_id: str) -> dict:
    """Run the agent with the given query."""
    initial_state = {
        "messages": [HumanMessage(content=query)],
        "context": [],
        "router_decision": "",
        "conversation_id": conversation_id,
        "query": query
    }
    
    # Run the graph
    result = await agent_graph.ainvoke(initial_state)
    
    # Extract response
    messages = result.get("messages", [])
    final_message = messages[-1] if messages else None
    
    # Get context/sources
    context = result.get("context", [])
    
    return {
        "answer": final_message.content if final_message else "I couldn't generate a response.",
        "sources": context,
        "confidence": 0.8,  # Default confidence
        "router_decision": result.get("router_decision", "unknown")
    }
