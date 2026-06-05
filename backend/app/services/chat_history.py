"""
Chat history service using DynamoDB for persistence.
"""

import os
import time
from typing import List, Optional
from datetime import datetime

import boto3
from dotenv import load_dotenv

load_dotenv()


class ChatHistoryService:
    def __init__(self):
        self.dynamodb = boto3.resource(
            'dynamodb',
            aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
            region_name=os.getenv('AWS_REGION', 'us-east-1')
        )
        self.table_name = os.getenv('DYNAMODB_TABLE_NAME', 'ChatHistory')
        self.table = self.dynamodb.Table(self.table_name)

    def save_message(
        self,
        conversation_id: str,
        role: str,
        content: str,
        sources: List[str] = None,
        confidence: float = None,
        router_decision: str = None
    ) -> dict:
        """Save a message to DynamoDB."""
        timestamp = int(time.time() * 1000)  # Milliseconds for sort key
        
        item = {
            'conversation_id': conversation_id,
            'timestamp': timestamp,
            'role': role,
            'content': content,
            'sources': sources or [],
            'created_at': datetime.now().isoformat()
        }
        
        if confidence is not None:
            item['confidence'] = confidence
        
        if router_decision is not None:
            item['router_decision'] = router_decision
        
        self.table.put_item(Item=item)
        
        return {
            'conversation_id': conversation_id,
            'timestamp': timestamp,
            'message': 'Message saved successfully'
        }

    def get_history(self, conversation_id: str, limit: int = 50) -> List[dict]:
        """Retrieve chat history for a conversation."""
        response = self.table.query(
            KeyConditionExpression='conversation_id = :cid',
            ExpressionAttributeValues={
                ':cid': conversation_id
            },
            ScanIndexForward=True,  # Ascending order (oldest first)
            Limit=limit
        )
        
        items = response.get('Items', [])
        
        return [
            {
                'role': item.get('role', 'user'),
                'content': item.get('content', ''),
                'timestamp': item.get('created_at', ''),
                'sources': item.get('sources', []),
                'confidence': item.get('confidence'),
                'router_decision': item.get('router_decision')
            }
            for item in items
        ]

    def delete_conversation(self, conversation_id: str) -> dict:
        """Delete all messages for a conversation."""
        # Query to get all items
        response = self.table.query(
            KeyConditionExpression='conversation_id = :cid',
            ExpressionAttributeValues={
                ':cid': conversation_id
            }
        )
        
        items = response.get('Items', [])
        
        # Delete each item
        with self.table.batch_writer() as batch:
            for item in items:
                batch.delete_item(
                    Key={
                        'conversation_id': item['conversation_id'],
                        'timestamp': item['timestamp']
                    }
                )
        
        return {
            'conversation_id': conversation_id,
            'deleted_count': len(items),
            'message': 'Conversation deleted successfully'
        }

    def get_conversation_count(self) -> int:
        """Get total number of conversations (approximate)."""
        response = self.table.scan(Select='COUNT')
        return response.get('Count', 0)

    def get_message_count(self) -> int:
        """Get total number of messages (approximate)."""
        response = self.table.scan(Select='COUNT')
        return response.get('Count', 0)


# Singleton instance
chat_history_service = ChatHistoryService()
