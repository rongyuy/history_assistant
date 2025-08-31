from fastapi import APIRouter
from app.schemas.main_schemas import WikiTopicResponse
from app.services import wikipedia_service

router = APIRouter()

@router.get("/topic/{topic_name}", response_model=WikiTopicResponse)
def get_topic_info(topic_name: str):
    data = wikipedia_service.get_topic_data(topic_name)
    return data