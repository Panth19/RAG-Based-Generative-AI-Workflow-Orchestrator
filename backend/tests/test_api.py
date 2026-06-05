"""
Unit tests for the RAG Enterprise Platform API.
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock
import json


# Mock the services before importing the app
@pytest.fixture(scope="session", autouse=True)
def mock_services():
    """Mock external services for testing."""
    with patch("app.services.ingestion.ingestion_service") as mock_ingestion:
        mock_ingestion.search_similar = AsyncMock(return_value=[
            {"id": "test-1", "score": 0.9, "text": "Test context", "source_file_name": "test.pdf"}
        ])
        mock_ingestion.process_document = AsyncMock(return_value={
            "file_id": "test-file-id",
            "s3_url": "s3://bucket/test.pdf",
            "chunks_count": 5,
            "status": "completed"
        })
        
        with patch("app.services.chat_history.chat_history_service") as mock_history:
            mock_history.get_history.return_value = []
            mock_history.save_message.return_value = {"message": "saved"}
            mock_history.get_message_count.return_value = 0
            
            with patch("app.services.agent.run_agent") as mock_agent:
                mock_agent.return_value = {
                    "answer": "Test answer",
                    "sources": ["test.pdf"],
                    "confidence": 0.85,
                    "router_decision": "search"
                }
                
                yield


@pytest.fixture
def client():
    """Create a test client."""
    from app.main import app
    return TestClient(app)


class TestHealthEndpoints:
    """Test health check endpoints."""
    
    def test_root(self, client):
        """Test root endpoint."""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "version" in data
    
    def test_health(self, client):
        """Test health endpoint."""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "uptime" in data


class TestChatEndpoint:
    """Test chat functionality."""
    
    def test_chat_success(self, client):
        """Test successful chat request."""
        response = client.post(
            "/chat",
            json={
                "message": "What is this document about?",
                "conversation_id": "test-conv-1"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "answer" in data
        assert "sources" in data
        assert "confidence" in data
    
    def test_chat_missing_message(self, client):
        """Test chat with missing message."""
        response = client.post(
            "/chat",
            json={"conversation_id": "test-conv-1"}
        )
        assert response.status_code == 422  # Validation error
    
    def test_chat_missing_conversation_id(self, client):
        """Test chat with missing conversation_id."""
        response = client.post(
            "/chat",
            json={"message": "Hello"}
        )
        assert response.status_code == 422  # Validation error


class TestUploadEndpoint:
    """Test file upload functionality."""
    
    def test_upload_success(self, client):
        """Test successful file upload."""
        # Create a test file
        test_content = b"This is test content for the document."
        
        response = client.post(
            "/upload",
            files={"file": ("test.txt", test_content, "text/plain")}
        )
        assert response.status_code == 200
        data = response.json()
        assert "file_url" in data
        assert "file_id" in data
    
    def test_upload_invalid_file_type(self, client):
        """Test upload with invalid file type."""
        test_content = b"test content"
        
        response = client.post(
            "/upload",
            files={"file": ("test.exe", test_content, "application/x-executable")}
        )
        assert response.status_code == 400


class TestHistoryEndpoint:
    """Test chat history functionality."""
    
    def test_get_history(self, client):
        """Test getting chat history."""
        response = client.get("/history/test-conversation")
        assert response.status_code == 200
        data = response.json()
        assert "conversation_id" in data
        assert "messages" in data


class TestAdminEndpoints:
    """Test admin functionality."""
    
    def test_get_metrics(self, client):
        """Test getting metrics."""
        response = client.get("/admin/metrics")
        assert response.status_code == 200
        data = response.json()
        assert "metrics" in data or "latest" in data
    
    def test_get_stats(self, client):
        """Test getting system stats."""
        response = client.get("/admin/stats")
        assert response.status_code == 200
        data = response.json()
        assert "uptime" in data
