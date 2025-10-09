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

@router.get("/html-content/{topic_name}")
def get_wiki_html_content_endpoint(topic_name: str):
    """
    获取用于智能阅读的、经过清理和结构化的维基百科页面内容。
    """
    return wikipedia_service.get_wiki_structured_content(topic_name)

# 【新增路由】获取讨论页的结构化HTML内容
@router.get("/wiki/discussion-html-content/{topic_name}")
def get_wiki_discussion_html_content_endpoint(topic_name: str):
    """
    获取用于智能阅读的、经过清理和结构化的维基百科【讨论页】内容。
    """
    # ▼▼▼ 请在这里加上下面这行代码 ▼▼▼
    print(f"--- ROUTER ENTRY POINT HIT for topic: {topic_name} ---")
    
    return wikipedia_service.get_wiki_discussion_structured_content(topic_name)

@router.get("/discussion-details/{topic_name}")
def get_discussion_details(topic_name: str, debate_item: str):
    """
    获取特定讨论要点的详细内容和多方观点分析
    """
    data = wikipedia_service.get_discussion_details(topic_name, debate_item)
    return data

@router.get("/sources/{topic_name}", response_model=SourceComparisonResponse)
def get_source_comparison(topic_name: str):
    """
    获取指定历史主题的参考文献，并进行多视角对比。
    """
    final_data = wikipedia_service.get_source_comparison(topic_name)
    return final_data

@router.get("/wiki/preview/{topic_name}", response_model=dict)
def get_wiki_preview(topic_name: str):
    """
    【新路由】用于获取维基百科悬浮窗预览摘要。
    """
    return wikipedia_service.get_wiki_preview_summary(topic_name)