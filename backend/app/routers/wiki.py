# backend/app/api/wiki.py

from fastapi import APIRouter
from app.schemas.main_schemas import (
    WikiTopicResponse, 
    ViewpointAnalysisResponse, 
    SourceComparisonResponse,
    ComparePairRequest, 
    SourceMaterial,
    DiscussionDetailRequest,
    RefreshDebatesRequest,
    DebatesResponse
)
from pydantic import BaseModel # <-- 3. 导入 BaseModel
from typing import List         # <-- 4. 导入 List
from app.services import wikipedia_service, llm_service

router = APIRouter()

# 5. 定义一个新的响应模型，因为这个接口只返回 "sources" 部分
class SourcesOnlyResponse(BaseModel):
    sources: List[SourceMaterial]


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

@router.post("/discussion-details")
def get_discussion_details_endpoint(request: DiscussionDetailRequest):
    """
    获取特定讨论要点的详细内容和多方观点分析
    """
    data = wikipedia_service.get_discussion_details(
        request.topic, 
        request.debate_item,
        request.current_factions  # <-- 将前端传来的阵营列表传递下去
    )
    return data

@router.post("/viewpoints/refresh-debates", response_model=DebatesResponse) # <-- 改为 POST，简化路径
def refresh_debates_endpoint(request: RefreshDebatesRequest): # <-- 接收请求体
    """
    一个专门的端点，只用于刷新维基讨论页的争议要点。
    """
    data = wikipedia_service.refresh_debate_points(
        request.topic,
        request.existing_debates # <-- 传入已存在的要点
    )
    return data

@router.get("/sources/{topic_name}", response_model=SourceComparisonResponse)
def get_source_comparison(topic_name: str):
    """
    获取指定历史主题的参考文献，并进行多视角对比。
    """
    final_data = wikipedia_service.get_source_comparison(topic_name)
    return final_data

# ▼▼▼ 在文件末尾添加这个全新的路由 ▼▼▼
@router.post("/sources/compare_pair", response_model=SourcesOnlyResponse)
def regenerate_comparison(request: ComparePairRequest):
    """
    接收一个包含2个史料的列表，并让AI为它们生成新的对读内容。
    """
    # 将 Pydantic 模型列表转换为 service 函数所需的字典列表
    source_dicts = [ref.dict() for ref in request.references]
    
    # 调用新的 service 函数，该函数只与LLM交互，不爬取网页
    data = wikipedia_service.regenerate_source_comparison_from_list(request.topic, source_dicts)
    return data
# ▲▲▲ 新路由结束 ▲▲▲


@router.get("/wiki/preview/{topic_name}", response_model=dict)
def get_wiki_preview(topic_name: str):
    """
    【新路由】用于获取维基百科悬浮窗预览摘要。
    """
    return wikipedia_service.get_wiki_preview_summary(topic_name)