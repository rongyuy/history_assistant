from fastapi import APIRouter
from app.schemas.main_schemas import WikiTopicResponse, ViewpointAnalysisResponse, SourceComparisonResponse
from app.services import wikipedia_service, llm_service

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

@router.get("/sources/{topic_name}", response_model=SourceComparisonResponse)
def get_source_comparison(topic_name: str):
    """
    新增：获取指定历史主题的参考文献，并进行多视角对比。
    """
    # 1. 获取参考文献内容
    scraped_contents = wikipedia_service.get_references_with_content(topic_name)
    
    # 2. 调用LLM服务进行分析和对比
    comparison_data = llm_service.generate_source_comparison(topic_name, scraped_contents)
    
    # 3. 封装并返回
    return comparison_data

@router.get("/full-content/{topic_name}")
def get_wiki_full_content(topic_name: str):
    """
    获取维基百科页面的完整原始内容，用于"阅读原文"功能
    """
    data = wikipedia_service.get_wiki_full_content(topic_name)
    return data