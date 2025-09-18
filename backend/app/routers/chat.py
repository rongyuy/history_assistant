from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from app.schemas.main_schemas import AIChatRequest
from app.services import llm_service

router = APIRouter()

@router.post("/chat")
async def handle_chat(request: AIChatRequest): # 改为 async def
    # 注意：这里调用的是我们新创建的异步生成器函数
    return StreamingResponse(llm_service.get_socratic_response_stream(request), media_type="text/event-stream")