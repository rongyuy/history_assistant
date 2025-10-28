# backend/app/schemas/main_schemas.py

# 存放所有Pydantic数据模型

from pydantic import BaseModel
from typing import List, Optional

# --- LLM 对话相关 ---
class ChatMessage(BaseModel):
    role: str
    content: str

class AIChatRequest(BaseModel):
    history: List[ChatMessage]
    topic: str
    current_module: str
    context_text: Optional[str] = None

# --- 维基百科相关 (修改后) ---
class TimelineEvent(BaseModel):
    year: str
    event: str
    source_text: str

class WikiReference(BaseModel):
    id: int
    text: str
    url: Optional[str] = None

class WikiTopicResponse(BaseModel):
    summary: str
    # 新增时间线字段
    timeline: List[TimelineEvent]

class Viewpoint(BaseModel):
    side: str  # 如 "A（英方观点）" 或 "B（清方观点）"
    text: str  # 观点描述

class ViewpointAnalysisResponse(BaseModel):
    viewpoints: List[Viewpoint]  # 对立观点列表
    debates: List[str]  # 维基讨论页要点列表
    full_discussion: str  # 完整讨论页内容

# --- 网页抓取相关 ---
class ScrapeRequest(BaseModel):
    url: str

class ScrapeResponse(BaseModel):
    success: bool
    url: str
    content: Optional[str] = None
    message: Optional[str] = None

# --- 史料对比相关 (修改) ---
class SourceMaterial(BaseModel):
    title: str
    url: str
    snippet: str
    viewpoint: str

class SourceComparisonResponse(BaseModel):
    sources: List[SourceMaterial]
    references: List[dict]

# ▼▼▼ 在文件末尾添加下面这两个新的 Class ▼▼▼
class SourceContent(BaseModel):
    title: str
    url: str
    content: str

class ComparePairRequest(BaseModel):
    topic: str
    references: List[SourceContent]
# ▲▲▲ 新增 Class 结束 ▲▲▲

# ▼▼▼ 在此处添加下面这两个新的 Class ▼▼▼
class HintRequest(BaseModel):
    topic: str
    card_title: str

class HintResponse(BaseModel):
    hints: List[str]
# ▲▲▲ 新增 Class 结束 ▲▲▲


# --- 数据库交互相关 (新增) ---

class NoteBase(BaseModel):
    id: str
    content: str
    type: str
    position_x: int
    position_y: int

class Note(NoteBase):
    inquiry_id: str

    class Config:
        from_attributes = True

class ConnectionBase(BaseModel):
    id: str
    source_note_id: str
    target_note_id: str

class Connection(ConnectionBase):
    inquiry_id: str
    
    class Config:
        from_attributes = True

class InquiryBase(BaseModel):
    topic: str

class InquiryCreate(InquiryBase):
    pass

class Inquiry(InquiryBase):
    id: str
    user_id: str
    notes: List[Note] = []
    connections: List[Connection] = []

    class Config:
        from_attributes = True
        
class NotesAndConnections(BaseModel):
    notes: List[Note]
    connections: List[Connection]
    
class DiscussionDetailRequest(BaseModel):
    topic: str
    debate_item: str

class RefreshDebatesRequest(BaseModel):
    topic: str
    existing_debates: List[str]

class DebatesResponse(BaseModel):
    debates: List[str]
    
class TimelineTextRequest(BaseModel):
    text: str
    
# ▼▼▼ 在此处添加下面这两个新的 Class ▼▼▼
class HintRequest(BaseModel):
    topic: str
    card_title: str
    context_text: Optional[str] = None  # <-- 【在这里添加这一行】

class HintResponse(BaseModel):
    hints: List[str]
# ▲▲▲ 新增 Class 结束 ▲▲▲