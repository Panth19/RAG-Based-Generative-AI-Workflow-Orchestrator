# ============================================================
# Document Ingestion Pipeline
# Handles: Loading -> Chunking -> Embedding -> Storage
# ============================================================

import os
import uuid
import tempfile
from typing import List, Optional
from dataclasses import dataclass

from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import (
    PyPDFLoader,
    TextLoader,
    Docx2txtLoader,
)
from langchain_core.documents import Document

# ============================================================
# Configuration
# ============================================================

CHUNK_SIZE = 500  # characters
CHUNK_OVERLAP = 50  # characters

@dataclass
class ChunkMetadata:
    source_file_name: str
    page_number: int
    chunk_id: str

class IngestionPipeline:
    """
    Document ingestion pipeline that processes files through:
    1. Loading (parse document)
    2. Chunking (split into manageable pieces)
    3. Embedding (create vector representations)
    4. Storage (upsert into Qdrant)
    """
    
    def __init__(self, qdrant_client=None, embedding_model=None):
        self.qdrant_client = qdrant_client
        self.embedding_model = embedding_model
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=CHUNK_SIZE,
            chunk_overlap=CHUNK_OVERLAP,
            length_function=len,
            separators=["\n\n", "\n", ". ", " ", ""],
        )
    
    def load_document(self, file_path: str, file_type: str) -> List[Document]:
        """Load document based on file type."""
        loaders = {
            "application/pdf": PyPDFLoader,
            "text/plain": TextLoader,
            "text/markdown": TextLoader,
            "application/msword": Docx2txtLoader,
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document": Docx2txtLoader,
        }
        
        loader_class = loaders.get(file_type)
        if not loader_class:
            raise ValueError(f"Unsupported file type: {file_type}")
        
        loader = loader_class(file_path)
        return loader.load()
    
    def chunk_documents(
        self, documents: List[Document], source_file_name: str
    ) -> List[dict]:
        """Split documents into chunks with metadata."""
        chunks = self.text_splitter.split_documents(documents)
        
        processed_chunks = []
        for i, chunk in enumerate(chunks):
            chunk_id = f"chunk-{uuid.uuid4().hex[:8]}"
            page_number = chunk.metadata.get("page", 1)
            
            processed_chunks.append({
                "id": chunk_id,
                "text": chunk.page_content,
                "metadata": {
                    "source_file_name": source_file_name,
                    "page_number": page_number,
                    "chunk_id": chunk_id,
                    "chunk_index": i,
                },
            })
        
        return processed_chunks
    
    async def embed_chunks(self, chunks: List[dict]) -> List[dict]:
        """Create embeddings for each chunk using Google Generative AI."""
        if not self.embedding_model:
            # Mock embeddings for development
            for chunk in chunks:
                chunk["embedding"] = [0.0] * 768  # embedding-001 dimension
            return chunks
        
        texts = [chunk["text"] for chunk in chunks]
        embeddings = await self.embedding_model.aembed_documents(texts)
        
        for chunk, embedding in zip(chunks, embeddings):
            chunk["embedding"] = embedding
        
        return chunks
    
    async def store_in_qdrant(
        self, chunks: List[dict], collection_name: str = "documents"
    ) -> int:
        """Upsert chunks into Qdrant vector database."""
        if not self.qdrant_client:
            # Mock storage for development
            return len(chunks)
        
        from qdrant_client.models import PointStruct
        
        points = []
        for chunk in chunks:
            points.append(
                PointStruct(
                    id=chunk["id"],
                    vector=chunk["embedding"],
                    payload={
                        "text": chunk["text"],
                        **chunk["metadata"],
                    },
                )
            )
        
        # Upsert in batches of 100
        batch_size = 100
        for i in range(0, len(points), batch_size):
            batch = points[i:i + batch_size]
            self.qdrant_client.upsert(
                collection_name=collection_name,
                points=batch,
            )
        
        return len(points)
    
    async def process_file(
        self,
        file_path: str,
        file_type: str,
        file_name: str,
    ) -> dict:
        """
        Full ingestion pipeline:
        1. Load document
        2. Chunk into pieces
        3. Create embeddings
        4. Store in Qdrant
        """
        # Step 1: Load
        documents = self.load_document(file_path, file_type)
        
        # Step 2: Chunk
        chunks = self.chunk_documents(documents, file_name)
        
        # Step 3: Embed
        chunks_with_embeddings = await self.embed_chunks(chunks)
        
        # Step 4: Store
        stored_count = await self.store_in_qdrant(chunks_with_embeddings)
        
        return {
            "file_name": file_name,
            "total_chunks": len(chunks),
            "stored_count": stored_count,
            "status": "completed",
        }

# ============================================================
# Singleton instance (created outside request handler for Lambda)
# ============================================================

pipeline = IngestionPipeline()
