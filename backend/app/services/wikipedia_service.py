# backend/app/services/wikipedia_service.py 

import wikipediaapi
from app.services import llm_service 
from app.services.scraping_service import fetch_url_content # 导入抓取函数
import requests

wiki = wikipediaapi.Wikipedia(
    user_agent='HistoryAssistant/1.0 (rongyuy@example.com)',
    language='zh'
)

# 新增函数：通过调用MediaWiki API获取外部链接
def get_external_links_from_wiki_api(topic_name: str) -> list:
    """
    通过直接调用 MediaWiki API 来获取页面所有外部链接。
    """
    S = requests.Session()
    URL = "https://zh.wikipedia.org/w/api.php"
    
    # API 参数，请求获取页面的外部链接（prop=extlinks）
    PARAMS = {
        "action": "query",
        "prop": "extlinks",
        "titles": topic_name,
        "format": "json",
        "ellimit": "max" # 获取所有外部链接
    }

    HEADERS = {
        'User-Agent': 'HistoryAssistant/1.0 (rongyuy@example.com)'
    }
    
    try:
        response = S.get(url=URL, params=PARAMS, headers=HEADERS,timeout=15)
        response.raise_for_status()
        data = response.json()
        
        # 解析返回的JSON数据，提取链接列表
        pages = data.get("query", {}).get("pages", {})
        references_urls = []
        for page_id, page_data in pages.items():
            if "extlinks" in page_data:
                for link_obj in page_data["extlinks"]:
                    references_urls.append(link_obj["*"])
        return references_urls
    except requests.RequestException as e:
        print(f"调用MediaWiki API失败: {e}")
        return []
    except Exception as e:
        print(f"解析MediaWiki API响应时出错: {e}")
        return []


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

def get_references_with_content(topic_name: str) -> dict:
    """
    获取维基百科的参考文献及其内容。
    """
    references_urls = get_external_links_from_wiki_api(topic_name)
    
    scraped_contents = []
    # 仅抓取前5个外部链接以避免超时
    for url in references_urls[:5]:
        print(f"正在抓取参考链接: {url}")
        content_data = fetch_url_content(url)
        # 将原始URL也存入，方便后续使用
        content_data['url'] = url
        scraped_contents.append(content_data)
        
    return scraped_contents

def get_wiki_full_content(topic_name: str) -> dict:
    """
    获取维基百科页面的完整原始内容，用于"阅读原文"功能
    """
    page = wiki.page(topic_name)
    
    if not page.exists():
        return {
            "title": f"抱歉,在维基百科中找不到关于'{topic_name}'的页面。",
            "content": "",
            "url": ""
        }
    
    # 获取完整的页面内容
    full_content = page.text
    
    # 获取页面的URL
    page_url = page.fullurl
    
    return {
        "title": page.title,
        "content": full_content,
        "url": page_url
    }

# --- 新增函数 ---
def get_structured_outline(topic_name: str) -> dict:
    """
    获取结构化大纲，用于笔记模块
    """
    page = wiki.page(topic_name)
    if not page.exists():
        return {
            "topic": topic_name,
            "timeline": "维基百科中找不到该主题，请手动填写。",
            "causality": "",
            "figures": "",
            "viewpoints": "",
            "evidence": "",
            "conclusion": ""
        }
    
    # 调用LLM服务生成结构化大纲
    outline_data = llm_service.generate_outline(topic_name, page.text)
    
    # 组合最终结果，确保所有字段都存在
    return {
        "topic": outline_data.get("topic", topic_name),
        "timeline": outline_data.get("timeline", ""),
        "causality": outline_data.get("causality", ""),
        "figures": outline_data.get("figures", ""),
        "viewpoints": outline_data.get("viewpoints", ""),
        "evidence": outline_data.get("evidence", ""),
        "conclusion": outline_data.get("conclusion", "")
    }
