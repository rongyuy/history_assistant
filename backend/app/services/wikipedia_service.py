# backend/app/services/wikipedia_service.py 

import wikipediaapi
from app.services import llm_service 

wiki = wikipediaapi.Wikipedia(
    user_agent='HistoryAssistant/1.0 (rongyuy@example.com)',
    language='zh'
)

def get_topic_data(topic_name: str) -> dict:
    page = wiki.page(topic_name)

    if not page.exists():
        return {
            "summary": f"抱歉,在维基百科中找不到关于'{topic_name}'的页面。",
            "timeline": []
        }

    # 1. 从LLM获取摘要和时间线
    structured_data = llm_service.generate_summary_and_timeline(topic_name, page.text)

    # 2. 直接从获取的数据中提取，并提供默认值以防万一
    summary = structured_data.get("summary", "AI未能生成摘要。")
    timeline = structured_data.get("timeline", [])
    
    # 3. 组合最终结果
    return {
        "summary": summary,
        "timeline": timeline
    }

def get_topic_discussion_data(topic_name: str) -> dict:
    """
    获取维基百科讨论页内容，用于观点辨析
    """
    # 获取主页面
    page = wiki.page(topic_name)
    
    if not page.exists():
        return {
            "viewpoints": [],
            "debates": [f"抱歉,在维基百科中找不到关于'{topic_name}'的页面。"]
        }
    
    # 获取讨论页
    talk_page = wiki.page(f"讨论:{topic_name}")
    
    # 准备讨论页内容
    talk_content = ""
    if talk_page.exists():
        talk_content = talk_page.text
    else:
        talk_content = f"关于'{topic_name}'的讨论页不存在或为空。"
    
    # 使用LLM分析对立观点和讨论页内容
    analysis_data = llm_service.analyze_viewpoints_and_debates(topic_name, page.text, talk_content)
    
    # 提取分析结果
    viewpoints = analysis_data.get("viewpoints", [])
    debates = analysis_data.get("debates", [])
    
    return {
        "viewpoints": viewpoints,
        "debates": debates
    }