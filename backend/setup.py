from setuptools import setup, find_packages

setup(
    name="rag-enterprise-backend",
    version="1.0.0",
    packages=find_packages(),
    install_requires=[
        "fastapi==0.109.2",
        "uvicorn[standard]==0.27.1",
        "langchain==0.1.9",
        "langgraph==0.2.14",
        "langchain-groq==0.1.3",
        "langchain-google-genai==0.0.11",
        "pinecone-client==4.0.0",
        "boto3==1.34.44",
        "python-multipart==0.0.9",
        "pydantic==2.6.3",
        "python-dotenv==1.0.1",
        "mangum==0.17.0",
        "slowapi==0.1.9",
    ],
    author="RAG Enterprise Team",
    description="RAG Enterprise Platform Backend",
    python_requires=">=3.11",
)
