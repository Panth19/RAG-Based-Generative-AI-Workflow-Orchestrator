# ============================================================
# RAGAS Evaluation Script
# Automated quality testing for the RAG system
# ============================================================

import json
import os
import sys
import time
from typing import List, Dict
from dataclasses import dataclass

# ============================================================
# Configuration
# ============================================================

QUALITY_GATE_THRESHOLD = 0.7  # Minimum context_precision
GOLDEN_DATASET_PATH = os.path.join(os.path.dirname(__file__), "golden_dataset.jsonl")
RESULTS_PATH = os.path.join(os.path.dirname(__file__), "eval_results.json")

# ============================================================
# Data Models
# ============================================================

@dataclass
class EvalResult:
    question: str
    expected_answer: str
    generated_answer: str
    faithfulness: float
    answer_relevance: float
    context_precision: float

@dataclass
class EvalSummary:
    total_questions: int
    passed_questions: int
    avg_faithfulness: float
    avg_answer_relevance: float
    avg_context_precision: float
    quality_gate_passed: bool
    details: List[EvalResult]

# ============================================================
# Load Golden Dataset
# ============================================================

def load_golden_dataset(path: str) -> List[Dict]:
    """Load questions from JSONL file."""
    dataset = []
    with open(path, "r") as f:
        for line in f:
            if line.strip():
                dataset.append(json.loads(line))
    return dataset

# ============================================================
# Mock RAG Query (for testing without deployed backend)
# ============================================================

def mock_rag_query(question: str, context: str) -> Dict:
    """
    Simulate RAG response for evaluation.
    In production, this calls the deployed API endpoint.
    """
    return {
        "answer": f"Based on the documents: {context[:200]}",
        "sources": [
            {
                "file_name": "document.pdf",
                "page_number": 1,
                "chunk_id": "chunk-001",
                "content": context,
                "score": 0.9,
            }
        ],
        "confidence": 0.85,
    }

# ============================================================
# RAGAS Metric Calculations (Simplified)
# ============================================================

def calculate_faithfulness(answer: str, context: str) -> float:
    """
    Calculate faithfulness score.
    Measures how well the answer is supported by the context.
    
    In production: Use RAGAS library with LLM-based evaluation.
    """
    # Simplified: check if answer references context content
    answer_words = set(answer.lower().split())
    context_words = set(context.lower().split())
    
    if not answer_words:
        return 0.0
    
    overlap = len(answer_words.intersection(context_words))
    return min(1.0, overlap / max(len(answer_words), 1) * 2)

def calculate_answer_relevance(question: str, answer: str) -> float:
    """
    Calculate answer relevance score.
    Measures how well the answer addresses the question.
    
    In production: Use RAGAS library with LLM-based evaluation.
    """
    # Simplified: check keyword overlap between question and answer
    question_words = set(question.lower().split())
    answer_words = set(answer.lower().split())
    
    if not question_words:
        return 0.0
    
    overlap = len(question_words.intersection(answer_words))
    return min(1.0, overlap / len(question_words) * 1.5)

def calculate_context_precision(question: str, context: str) -> float:
    """
    Calculate context precision score.
    Measures how relevant the retrieved context is to the question.
    
    In production: Use RAGAS library with LLM-based evaluation.
    """
    # Simplified: check keyword overlap between question and context
    question_words = set(question.lower().split())
    context_words = set(context.lower().split())
    
    if not question_words:
        return 0.0
    
    overlap = len(question_words.intersection(context_words))
    return min(1.0, overlap / len(question_words) * 2)

# ============================================================
# Run Evaluation
# ============================================================

def run_evaluation() -> EvalSummary:
    """Run evaluation on the golden dataset."""
    print("📊 Loading golden dataset...")
    dataset = load_golden_dataset(GOLDEN_DATASET_PATH)
    print(f"   Loaded {len(dataset)} questions")
    
    results = []
    passed = 0
    
    print("\n🔍 Running evaluation...")
    for i, item in enumerate(dataset):
        question = item["question"]
        expected = item["answer"]
        context = item["context"]
        
        # Query the RAG system
        response = mock_rag_query(question, context)
        generated = response["answer"]
        
        # Calculate metrics
        faithfulness = calculate_faithfulness(generated, context)
        relevance = calculate_answer_relevance(question, generated)
        precision = calculate_context_precision(question, context)
        
        # Check if this question passed
        if precision >= QUALITY_GATE_THRESHOLD:
            passed += 1
        
        result = EvalResult(
            question=question,
            expected_answer=expected,
            generated_answer=generated,
            faithfulness=faithfulness,
            answer_relevance=relevance,
            context_precision=precision,
        )
        results.append(result)
        
        # Progress indicator
        status = "✅" if precision >= QUALITY_GATE_THRESHOLD else "❌"
        print(f"   {status} Q{i+1}: precision={precision:.2f}")
    
    # Calculate averages
    avg_faithfulness = sum(r.faithfulness for r in results) / len(results)
    avg_relevance = sum(r.answer_relevance for r in results) / len(results)
    avg_precision = sum(r.context_precision for r in results) / len(results)
    
    quality_gate_passed = avg_precision >= QUALITY_GATE_THRESHOLD
    
    return EvalSummary(
        total_questions=len(dataset),
        passed_questions=passed,
        avg_faithfulness=avg_faithfulness,
        avg_answer_relevance=avg_relevance,
        avg_context_precision=avg_precision,
        quality_gate_passed=quality_gate_passed,
        details=results,
    )

# ============================================================
# Save Results
# ============================================================

def save_results(summary: EvalSummary, path: str):
    """Save evaluation results to JSON file."""
    results = {
        "timestamp": time.time() * 1000,
        "total_questions": summary.total_questions,
        "passed_questions": summary.passed_questions,
        "pass_rate": summary.passed_questions / summary.total_questions,
        "avg_faithfulness": summary.avg_faithfulness,
        "avg_answer_relevance": summary.avg_answer_relevance,
        "avg_context_precision": summary.avg_context_precision,
        "quality_gate_passed": summary.quality_gate_passed,
        "quality_gate_threshold": QUALITY_GATE_THRESHOLD,
        "details": [
            {
                "question": r.question,
                "expected_answer": r.expected_answer,
                "generated_answer": r.generated_answer,
                "faithfulness": r.faithfulness,
                "answer_relevance": r.answer_relevance,
                "context_precision": r.context_precision,
            }
            for r in summary.details
        ],
    }
    
    with open(path, "w") as f:
        json.dump(results, f, indent=2)
    
    print(f"\n💾 Results saved to {path}")

# ============================================================
# Main
# ============================================================

def main():
    print("=" * 60)
    print("🚀 RAG Enterprise Platform - Quality Evaluation")
    print("=" * 60)
    
    summary = run_evaluation()
    
    print("\n" + "=" * 60)
    print("📊 Evaluation Summary")
    print("=" * 60)
    print(f"   Total Questions:    {summary.total_questions}")
    print(f"   Passed Questions:   {summary.passed_questions}")
    print(f"   Pass Rate:          {summary.passed_questions/summary.total_questions*100:.1f}%")
    print(f"\n   Avg Faithfulness:      {summary.avg_faithfulness:.3f}")
    print(f"   Avg Answer Relevance:  {summary.avg_answer_relevance:.3f}")
    print(f"   Avg Context Precision: {summary.avg_context_precision:.3f}")
    print(f"\n   Quality Gate Threshold: {QUALITY_GATE_THRESHOLD}")
    print(f"   Quality Gate Status:    {'✅ PASSED' if summary.quality_gate_passed else '❌ FAILED'}")
    print("=" * 60)
    
    # Save results
    save_results(summary, RESULTS_PATH)
    
    # Exit with appropriate code for CI/CD
    if not summary.quality_gate_passed:
        print("\n❌ Quality gate FAILED. Exiting with code 1.")
        sys.exit(1)
    else:
        print("\n✅ Quality gate PASSED. Ready for deployment.")
        sys.exit(0)

if __name__ == "__main__":
    main()
