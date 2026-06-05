"""
RAGAS Evaluation Script for RAG Enterprise Platform.
Tests RAG quality against a golden dataset.
"""

import os
import json
import sys
from datetime import datetime
from typing import List, Dict, Any

import httpx
from dotenv import load_dotenv

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), '..', 'backend', '.env'))

# Configuration
API_BASE_URL = os.getenv('API_BASE_URL', 'http://localhost:8000')
GOLDEN_DATASET_PATH = os.path.join(os.path.dirname(__file__), 'golden_dataset.jsonl')
RESULTS_PATH = os.path.join(os.path.dirname(__file__), 'eval_results.json')
QUALITY_THRESHOLD = 0.7  # 70% minimum for context precision


def load_golden_dataset() -> List[Dict[str, Any]]:
    """Load the golden dataset from JSONL file."""
    dataset = []
    with open(GOLDEN_DATASET_PATH, 'r', encoding='utf-8') as f:
        for line in f:
            if line.strip():
                dataset.append(json.loads(line))
    return dataset


def query_api(question: str, conversation_id: str = "eval-test") -> Dict[str, Any]:
    """Send a query to the RAG API and get response."""
    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.post(
                f"{API_BASE_URL}/chat",
                json={
                    "message": question,
                    "conversation_id": conversation_id
                }
            )
            response.raise_for_status()
            return response.json()
    except httpx.HTTPError as e:
        print(f"API Error: {e}")
        return {
            "answer": "",
            "sources": [],
            "confidence": 0.0
        }


def calculate_faithfulness(answer: str, context: List[str], expected_answer: str) -> float:
    """
    Calculate faithfulness score.
    Measures if the answer is grounded in the context.
    """
    if not answer or not context:
        return 0.0
    
    # Simple heuristic: check if key terms from context appear in answer
    context_text = " ".join(context).lower()
    answer_lower = answer.lower()
    
    # Count context terms found in answer
    context_words = set(context_text.split())
    answer_words = set(answer_lower.split())
    
    overlap = len(context_words.intersection(answer_words))
    total = len(context_words) if context_words else 1
    
    # Also consider similarity with expected answer
    expected_words = set(expected_answer.lower().split())
    answer_expected_overlap = len(expected_words.intersection(answer_words))
    expected_total = len(expected_words) if expected_words else 1
    
    # Combined score
    context_score = min(overlap / max(total * 0.3, 1), 1.0)
    answer_score = answer_expected_overlap / expected_total
    
    return (context_score * 0.5 + answer_score * 0.5)


def calculate_answer_relevance(question: str, answer: str) -> float:
    """
    Calculate answer relevance score.
    Measures if the answer addresses the question.
    """
    if not answer:
        return 0.0
    
    # Simple heuristic based on question-answer word overlap
    question_words = set(question.lower().split())
    answer_words = set(answer.lower().split())
    
    # Remove common stop words
    stop_words = {'what', 'is', 'the', 'how', 'does', 'a', 'an', 'and', 'or', 'it', 'this', 'that', 'are', 'for'}
    question_words -= stop_words
    answer_words -= stop_words
    
    if not question_words:
        return 0.5  # Neutral score if no meaningful question words
    
    overlap = len(question_words.intersection(answer_words))
    
    # Score based on overlap and answer length
    relevance_score = min(overlap / len(question_words), 1.0)
    
    # Bonus for substantive answers
    if len(answer_words) >= 5:
        relevance_score = min(relevance_score + 0.2, 1.0)
    
    return relevance_score


def calculate_context_precision(answer: str, sources: List[str], context: List[str]) -> float:
    """
    Calculate context precision score.
    Measures if retrieved context is relevant to the answer.
    """
    if not context:
        return 0.0
    
    answer_words = set(answer.lower().split())
    
    precisions = []
    for ctx in context:
        ctx_words = set(ctx.lower().split())
        if ctx_words:
            overlap = len(answer_words.intersection(ctx_words))
            precision = overlap / len(ctx_words)
            precisions.append(precision)
    
    return sum(precisions) / len(precisions) if precisions else 0.0


def evaluate_dataset() -> Dict[str, Any]:
    """Run evaluation on the entire golden dataset."""
    print("=" * 60)
    print("RAGAS Evaluation Script")
    print("=" * 60)
    
    # Load dataset
    print("\nLoading golden dataset...")
    dataset = load_golden_dataset()
    print(f"Loaded {len(dataset)} test cases")
    
    # Results storage
    results = []
    metrics_history = []
    
    # Evaluate each test case
    print("\nRunning evaluations...")
    for i, test_case in enumerate(dataset, 1):
        print(f"\n[{i}/{len(dataset)}] Question: {test_case['question'][:50]}...")
        
        # Query the API
        response = query_api(test_case['question'], f"eval-{i}")
        
        # Calculate metrics
        faithfulness = calculate_faithfulness(
            response.get('answer', ''),
            response.get('sources', []),
            test_case['answer']
        )
        
        relevance = calculate_answer_relevance(
            test_case['question'],
            response.get('answer', '')
        )
        
        precision = calculate_context_precision(
            response.get('answer', ''),
            response.get('sources', []),
            [test_case['context']]
        )
        
        # Store result
        result = {
            'question': test_case['question'],
            'expected_answer': test_case['answer'],
            'actual_answer': response.get('answer', ''),
            'sources': response.get('sources', []),
            'metrics': {
                'faithfulness': faithfulness,
                'answer_relevance': relevance,
                'context_precision': precision
            }
        }
        results.append(result)
        
        print(f"  Faithfulness: {faithfulness:.2%}")
        print(f"  Relevance: {relevance:.2%}")
        print(f"  Precision: {precision:.2%}")
    
    # Calculate aggregate metrics
    if results:
        avg_faithfulness = sum(r['metrics']['faithfulness'] for r in results) / len(results)
        avg_relevance = sum(r['metrics']['answer_relevance'] for r in results) / len(results)
        avg_precision = sum(r['metrics']['context_precision'] for r in results) / len(results)
        overall_score = (avg_faithfulness + avg_relevance + avg_precision) / 3
        
        metrics_entry = {
            'faithfulness': avg_faithfulness,
            'answer_relevance': avg_relevance,
            'context_precision': avg_precision,
            'overall_score': overall_score,
            'timestamp': datetime.now().isoformat()
        }
        metrics_history.append(metrics_entry)
    else:
        avg_faithfulness = 0
        avg_relevance = 0
        avg_precision = 0
        overall_score = 0
    
    # Print summary
    print("\n" + "=" * 60)
    print("EVALUATION SUMMARY")
    print("=" * 60)
    print(f"Total Test Cases: {len(dataset)}")
    print(f"\nAverage Faithfulness: {avg_faithfulness:.2%}")
    print(f"Average Relevance: {avg_relevance:.2%}")
    print(f"Average Context Precision: {avg_precision:.2%}")
    print(f"Overall Score: {overall_score:.2%}")
    
    # Quality gate check
    print("\n" + "-" * 60)
    if avg_precision >= QUALITY_THRESHOLD:
        print(f"✅ QUALITY GATE PASSED (Context Precision: {avg_precision:.2%} >= {QUALITY_THRESHOLD:.0%})")
        gate_status = "passed"
    else:
        print(f"❌ QUALITY GATE FAILED (Context Precision: {avg_precision:.2%} < {QUALITY_THRESHOLD:.0%})")
        gate_status = "failed"
    print("-" * 60)
    
    # Save results
    output = {
        'metrics': metrics_history,
        'latest': metrics_history[-1] if metrics_history else None,
        'detailed_results': results,
        'summary': {
            'total_cases': len(dataset),
            'avg_faithfulness': avg_faithfulness,
            'avg_relevance': avg_relevance,
            'avg_precision': avg_precision,
            'overall_score': overall_score,
            'gate_status': gate_status
        }
    }
    
    with open(RESULTS_PATH, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2)
    
    print(f"\nResults saved to: {RESULTS_PATH}")
    
    # Return exit code based on quality gate
    return 0 if gate_status == "passed" else 1


if __name__ == "__main__":
    exit_code = evaluate_dataset()
    sys.exit(exit_code)
