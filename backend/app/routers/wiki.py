from fastapi import APIRouter
from app.schemas.main_schemas import WikiTopicResponse, ViewpointAnalysisResponse
from app.services import wikipedia_service

router = APIRouter()

@router.get("/topic/{topic_name}", response_model=WikiTopicResponse)
def get_topic_info(topic_name: str):
    data = wikipedia_service.get_topic_data(topic_name)
    return data

@router.get("/viewpoints/{topic_name}", response_model=ViewpointAnalysisResponse)
def get_viewpoint_analysis(topic_name: str):
    """
    获取指定主题的观点辨析数据，包括对立观点和维基讨论页摘要
    """
    data = wikipedia_service.get_topic_discussion_data(topic_name)
    return data