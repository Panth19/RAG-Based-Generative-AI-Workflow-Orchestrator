# ============================================================
# RAG Enterprise Platform - API Tests
# ============================================================

import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_health_check():
    """Test health endpoint returns 200."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "version" in data
    assert "services" in data

def test_chat_endpoint():
    """Test chat endpoint accepts queries."""
    response = client.post(
        "/chat",
        json={"query": "Hello, how are you?"}
    )
    assert response.status_code == 200

def test_upload_endpoint():
    """Test upload endpoint validates file types."""
    # Create a test file
    import io
    test_file = io.BytesIO(b"test content")
    
    response = client.post(
        "/upload",
        files={"file": ("test.txt", test_file, "text/plain")}
    )
    assert response.status_code == 200
    data = response.json()
    assert "file_id" in data
    assert data["status"] == "processing"

def test_admin_status():
    """Test admin status endpoint."""
    response = client.get("/admin/status")
    assert response.status_code == 200
    data = response.json()
    assert "groqStatus" in data
    assert "geminiStatus" in data
    assert "qdrantStatus" in data

def test_admin_evaluation():
    """Test admin evaluation endpoint."""
    response = client.get("/admin/evaluation")
    assert response.status_code == 200
    data = response.json()
    assert "results" in data
