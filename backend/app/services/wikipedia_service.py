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
            "summary": f"抱歉,在维基百科中找不到关于“{topic_name}”的页面。",
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