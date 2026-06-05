"""
Document ingestion service for processing and storing documents in Pinecone.
"""

import os
import uuid
import tempfile
from typing import List, Dict, Any
from pathlib import Path

import boto3
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from pinecone import Pinecone
from dotenv import load_dotenv

load_dotenv()

# Configuration
CHUNK_SIZE = 500
CHUNK_OVERLAP = 50
EMBEDDING_MODEL = "models/text-embedding-001"
TOP_K = 3


class IngestionService:
    def __init__(self):
        # AWS S3 Client
        self.s3_client = boto3.client(
            's3',
            aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
            region_name=os.getenv('AWS_REGION', 'us-east-1')
        )
        self.s3_bucket = os.getenv('S3_BUCKET_NAME', '')
        
        # Pinecone Client
        pc = Pinecone(api_key=os.getenv('PINECONE_API_KEY', ''))
        self.index_name = os.getenv('PINECONE_INDEX_NAME', 'rag-enterprise-index')
        self.index = pc.Index(self.index_name)
        
        # Embeddings
        self.embeddings = GoogleGenerativeAIEmbeddings(
            model=EMBEDDING_MODEL,
            google_api_key=os.getenv('GOOGLE_API_KEY')
        )
        
        # Text Splitter
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=CHUNK_SIZE,
            chunk_overlap=CHUNK_OVERLAP,
            length_function=len,
            is_separator_regex=False
        )

    def upload_to_s3(self, file_content: bytes, filename: str) -> str:
        """Upload file to S3 and return the URL."""
        file_id = str(uuid.uuid4())
        s3_key = f"uploads/{file_id}/{filename}"
        
        self.s3_client.put_object(
            Bucket=self.s3_bucket,
            Key=s3_key,
            Body=file_content
        )
        
        return f"s3://{self.s3_bucket}/{s3_key}"

    def extract_text(self, file_path: str, file_type: str) -> str:
        """Extract text from different file types."""
        if file_type == "text/plain" or file_path.endswith('.txt'):
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read()
        elif file_type == "text/markdown" or file_path.endswith('.md'):
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read()
        elif file_type == "application/pdf" or file_path.endswith('.pdf'):
            try:
                import PyPDF2
                with open(file_path, 'rb') as f:
                    pdf_reader = PyPDF2.PdfReader(f)
                    text = ""
                    for page in pdf_reader.pages:
                        text += page.extract_text() + "\n"
                    return text
            except ImportError:
                # Fallback: try to read as text
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    return f.read()
        elif file_type == "text/csv" or file_path.endswith('.csv'):
            import csv
            with open(file_path, 'r', encoding='utf-8') as f:
                csv_reader = csv.reader(f)
                return "\n".join([", ".join(row) for row in csv_reader])
        else:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                return f.read()

    def chunk_text(self, text: str) -> List[Dict[str, Any]]:
        """Split text into chunks with metadata."""
        chunks = self.text_splitter.create_documents([text])
        
        result = []
        for i, chunk in enumerate(chunks):
            result.append({
                "id": str(uuid.uuid4()),
                "text": chunk.page_content,
                "metadata": {
                    "chunk_id": i,
                    "chunk_size": len(chunk.page_content)
                }
            })
        
        return result

    async def process_document(self, file_content: bytes, filename: str, file_type: str) -> Dict[str, Any]:
        """Main ingestion pipeline."""
        # Upload to S3
        s3_url = self.upload_to_s3(file_content, filename)
        file_id = s3_url.split('/')[-2]
        
        # Save temporarily for processing
        with tempfile.NamedTemporaryFile(delete=False, suffix=Path(filename).suffix) as tmp_file:
            tmp_file.write(file_content)
            tmp_path = tmp_file.name
        
        try:
            # Extract text
            text = self.extract_text(tmp_path, file_type)
            
            if not text.strip():
                raise ValueError("No text content extracted from document")
            
            # Chunk text
            chunks = self.chunk_text(text)
            
            # Generate embeddings and upsert to Pinecone
            vectors = []
            for chunk in chunks:
                embedding = self.embeddings.embed_query(chunk["text"])
                vectors.append({
                    "id": chunk["id"],
                    "values": embedding,
                    "metadata": {
                        "text": chunk["text"],
                        "source_file_name": filename,
                        "file_id": file_id,
                        "chunk_id": chunk["metadata"]["chunk_id"]
                    }
                })
            
            # Upsert in batches
            batch_size = 100
            for i in range(0, len(vectors), batch_size):
                batch = vectors[i:i + batch_size]
                self.index.upsert(vectors=batch)
            
            return {
                "file_id": file_id,
                "s3_url": s3_url,
                "chunks_count": len(chunks),
                "status": "completed"
            }
            
        finally:
            # Cleanup temporary file
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)

    async def search_similar(self, query: str, top_k: int = TOP_K) -> List[Dict[str, Any]]:
        """Search for similar documents in Pinecone."""
        # Embed the query
        query_embedding = self.embeddings.embed_query(query)
        
        # Search Pinecone
        results = self.index.query(
            vector=query_embedding,
            top_k=top_k,
            include_metadata=True
        )
        
        # Extract and return results
        documents = []
        for match in results.get("matches", []):
            documents.append({
                "id": match["id"],
                "score": match["score"],
                "text": match["metadata"].get("text", ""),
                "source_file_name": match["metadata"].get("source_file_name", "Unknown")
            })
        
        return documents


# Singleton instance
ingestion_service = IngestionService()
