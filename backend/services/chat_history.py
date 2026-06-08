# ============================================================
# Chat History Service - DynamoDB/SQLite Implementation
# ============================================================

import os
import time
import json
import sqlite3
from typing import List, Optional
from dataclasses import dataclass, asdict

# ============================================================
# Data Models
# ============================================================

@dataclass
class ChatMessage:
    conversation_id: str
    timestamp: float
    role: str  # 'user' | 'assistant' | 'system'
    content: str
    metadata: Optional[dict] = None

# ============================================================
# SQLite Implementation (Local/Free Tier Alternative to DynamoDB)
# ============================================================

class ChatHistoryService:
    """
    Chat history storage using SQLite.
    In production, this would use DynamoDB with the following schema:
    - Partition Key: conversation_id (String)
    - Sort Key: timestamp (Number)
    """
    
    def __init__(self, db_path: str = "chat_history.db"):
        self.db_path = db_path
        self._init_db()
    
    def _init_db(self):
        """Initialize the SQLite database."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS chat_history (
                conversation_id TEXT NOT NULL,
                timestamp REAL NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                metadata TEXT,
                PRIMARY KEY (conversation_id, timestamp)
            )
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_conversation_id 
            ON chat_history(conversation_id)
        """)
        conn.commit()
        conn.close()
    
    def put_item(self, message: ChatMessage) -> bool:
        """Save a chat message."""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT OR REPLACE INTO chat_history 
                (conversation_id, timestamp, role, content, metadata)
                VALUES (?, ?, ?, ?, ?)
                """,
                (
                    message.conversation_id,
                    message.timestamp,
                    message.role,
                    message.content,
                    json.dumps(message.metadata) if message.metadata else None,
                ),
            )
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            print(f"Error saving message: {e}")
            return False
    
    def query(
        self,
        conversation_id: str,
        limit: int = 50,
        ascending: bool = True,
    ) -> List[ChatMessage]:
        """Retrieve chat history for a conversation."""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            order = "ASC" if ascending else "DESC"
            cursor.execute(
                f"""
                SELECT conversation_id, timestamp, role, content, metadata
                FROM chat_history
                WHERE conversation_id = ?
                ORDER BY timestamp {order}
                LIMIT ?
                """,
                (conversation_id, limit),
            )
            
            messages = []
            for row in cursor.fetchall():
                messages.append(
                    ChatMessage(
                        conversation_id=row[0],
                        timestamp=row[1],
                        role=row[2],
                        content=row[3],
                        metadata=json.loads(row[4]) if row[4] else None,
                    )
                )
            
            conn.close()
            return messages
        except Exception as e:
            print(f"Error querying messages: {e}")
            return []
    
    def get_conversations(self, limit: int = 20) -> List[dict]:
        """Get list of conversations with metadata."""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT 
                    conversation_id,
                    MIN(timestamp) as created_at,
                    MAX(timestamp) as updated_at,
                    COUNT(*) as message_count,
                    MIN(CASE WHEN role = 'user' THEN content END) as first_message
                FROM chat_history
                GROUP BY conversation_id
                ORDER BY MAX(timestamp) DESC
                LIMIT ?
                """,
                (limit,),
            )
            
            conversations = []
            for row in cursor.fetchall():
                conversations.append({
                    "conversation_id": row[0],
                    "created_at": row[1],
                    "updated_at": row[2],
                    "message_count": row[3],
                    "title": (row[4][:50] + "...") if row[4] and len(row[4]) > 50 else row[4],
                })
            
            conn.close()
            return conversations
        except Exception as e:
            print(f"Error getting conversations: {e}")
            return []
    
    def delete_conversation(self, conversation_id: str) -> bool:
        """Delete a conversation and all its messages."""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute(
                "DELETE FROM chat_history WHERE conversation_id = ?",
                (conversation_id,),
            )
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            print(f"Error deleting conversation: {e}")
            return False

# ============================================================
# Singleton
# ============================================================

chat_history = ChatHistoryService()
