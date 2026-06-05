# Contributing to RAG Enterprise Platform

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing.

## Getting Started

1. Fork the repository
2. Clone your fork
3. Create a feature branch
4. Make your changes
5. Submit a pull request

## Development Setup

### Prerequisites

- Python 3.11+
- Node.js 20+
- Docker (optional)

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pip install pytest pytest-asyncio
```

### Frontend Setup

```bash
npm install
npm run dev
```

## Code Style

### Python

- Follow PEP 8
- Use type hints
- Write docstrings for functions and classes
- Format with black

### TypeScript/React

- Use TypeScript
- Follow ESLint rules
- Use functional components with hooks
- Format with Prettier

## Testing

### Backend Tests

```bash
cd backend
pytest tests/ -v
```

### Frontend Tests

```bash
npm test
```

### RAGAS Evaluation

```bash
cd evaluation
python test_rag_quality.py
```

## Pull Request Process

1. Update documentation if needed
2. Add tests for new features
3. Ensure all tests pass
4. Update README if adding new features
5. Request review from maintainers

## Code of Conduct

- Be respectful
- Welcome newcomers
- Focus on constructive feedback
- Help others learn

## Questions?

Open an issue with the label "question" for any questions.
