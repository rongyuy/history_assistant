from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from app.services import llm_service
from app.schemas.main_schemas import (
    AIChatRequest, 
    HintRequest, 
    HintResponse
)

router = APIRouter()

@router.post("/chat")
async def handle_chat(request: AIChatRequest): # 改为 async def
    # 注意：这里调用的是我们新创建的异步生成器函数
    return StreamingResponse(llm_service.get_socratic_response_stream(request), media_type="text/event-stream")

# ▼▼▼ 在文件末尾添加这个全新的路由 ▼▼▼
@router.post("/hints", response_model=HintResponse)
def get_thinking_hints(request: HintRequest):
    """
    接收一个主题和卡片标题，返回AI生成的思考提示。
    """
    # 调用llm_service中的新函数
    data = llm_service.generate_thinking_hints(request.topic, request.card_title)
    return data
# ▲▲▲ 新路由结束 ▲▲▲
