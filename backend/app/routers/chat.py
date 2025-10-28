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

@router.post("/hints", response_model=HintResponse)
def get_thinking_hints(request: HintRequest):
    """
    接收一个主题、卡片标题和【可选的上下文材料】，返回AI生成的思考提示。
    """
    # 调用llm_service中的新函数，并传入新的上下文参数
    data = llm_service.generate_thinking_hints(
        request.topic, 
        request.card_title,
        request.context_text  # <-- 【在这里添加这个参数】
    )
    return data
