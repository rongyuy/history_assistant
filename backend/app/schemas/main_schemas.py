# 存放所有Pydantic数据模型

from pydantic import BaseModel
from typing import List, Optional

# --- LLM 对话相关 ---
class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str

class AIChatRequest(BaseModel):
    history: List[ChatMessage]
    topic: str
    current_module: str
    context_text: Optional[str] = None

# --- 维基百科相关 ---
class WikiReference(BaseModel):
    id: int
    text: str
    url: Optional[str] = None

class WikiTopicResponse(BaseModel):
    summary: str
    references: List[WikiReference]

# --- 网页抓取相关 ---
class ScrapeRequest(BaseModel):
    url: str

class ScrapeResponse(BaseModel):
    success: bool
    url: str
    content: Optional[str] = None
    message: Optional[str] = None