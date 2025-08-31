from fastapi import APIRouter
from app.schemas.main_schemas import AIChatRequest
from app.services import llm_service

router = APIRouter()

@router.post("/chat")
def handle_chat(request: AIChatRequest):
    response_text = llm_service.get_socratic_response(request)
    return {"role": "assistant", "content": response_text}