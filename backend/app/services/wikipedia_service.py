# backend/app/services/wikipedia_service.py 
import asyncio
import httpx
import wikipediaapi
from app.services import llm_service 
from app.services.scraping_service import fetch_url_content_async
import requests

wiki = wikipediaapi.Wikipedia(
    user_agent='HistoryAssistant/1.0 (rongyuy@example.com)',
    language='zh',
    timeout=30
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
        response = S.get(url=URL, params=PARAMS, headers=HEADERS,timeout=90)
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
            "faction_roles": [],
            "viewpoints": [],
            "debates": [f"抱歉,在维基百科中找不到关于'{topic_name}'的页面。"],
            "full_discussion": ""
        }
    
    # 获取讨论页
    talk_page = wiki.page(f"讨论:{topic_name}")
    
    # 准备讨论页内容
    talk_content = ""
    if talk_page.exists():
        talk_content = talk_page.text
    else:
        talk_content = f"关于'{topic_name}'的讨论页不存在或为空。"
    
    # --- 核心修改 ---
    # 1. 调用新增的LLM服务，分析各阵营作用
    faction_roles_data = llm_service.analyze_faction_roles(topic_name, page.text)
    
    # 2. 调用原有的LLM服务，分析对立观点和讨论页内容
    analysis_data = llm_service.analyze_viewpoints_and_debates(topic_name, page.text, talk_content)
    
    # 3. 从两次调用中分别提取所需数据
    faction_roles = faction_roles_data.get("faction_roles", [])
    viewpoints = analysis_data.get("viewpoints", [])
    debates = analysis_data.get("debates", [])
    
    # 4. 将所有数据合并到最终的返回结果中
    return {
        "faction_roles": faction_roles,
        "viewpoints": viewpoints,
        "debates": debates,
        "full_discussion": talk_content
    }

# 【核心修改】将 get_references_with_content 完全改造为异步并行模式
async def get_references_with_content_async(topic_name: str, limit: int = 20) -> list:
    """
    异步、并行地获取维基百科的参考文献及其内容。
    """
    references_urls = get_external_links_from_wiki_api(topic_name)
    
    # 使用 httpx.AsyncClient 来管理连接池
    async with httpx.AsyncClient() as client:
        # 创建所有需要执行的抓取任务
        tasks = [
            fetch_url_content_async(client, url) 
            for url in references_urls[:limit] # 使用 limit 参数控制数量
        ]
        # 使用 asyncio.gather 并行执行所有任务
        scraped_contents = await asyncio.gather(*tasks, return_exceptions=True)
        
    # 过滤掉在 gather 中可能出现的异常
    return [res for res in scraped_contents if not isinstance(res, Exception)]

# 【核心修改】改造 get_source_comparison 来调用新的异步函数
def get_source_comparison(topic_name: str) -> dict:
    """
    获取关于特定主题的多源史料对比分析，并包含原始参考文献。
    这个函数负责整合数据。
    """
    # 1. 【新】使用 asyncio.run() 来执行我们的异步抓取函数
    #    在这里将文献数量限制从10改为了20
    all_scraped_contents = asyncio.run(get_references_with_content_async(topic_name, limit=20))
    
    # 步骤 A: 筛选出抓取成功的文献 (这部分逻辑不变)
    successful_contents = [
        item for item in all_scraped_contents if item and item.get("success") and item.get("content")
    ]

    # 2. 调用LLM服务 (这部分逻辑不变)
    comparison_data = llm_service.generate_source_comparison(topic_name, successful_contents)

    # 步骤 B: 为所有抓取成功的内容生成中文摘要 (这部分逻辑不变)
    for item in successful_contents:
        item['content'] = llm_service.summarize_reference_content(item['content'])

    # 3. 返回最终结果 (这部分逻辑不变)
    return {
        "sources": comparison_data.get("sources", []),
        "references": successful_contents
    }

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

def get_discussion_details(topic_name: str, debate_item: str) -> dict:
    """
    获取特定讨论要点的详细内容和多方观点分析
    """
    # 获取主页面和讨论页
    page = wiki.page(topic_name)
    talk_page = wiki.page(f"讨论:{topic_name}")
    
    if not page.exists():
        return {
            "detailed_viewpoints": [],
            "discussion_content": f"抱歉,在维基百科中找不到关于'{topic_name}'的页面。"
        }
    
    # 准备讨论页内容
    talk_content = ""
    if talk_page.exists():
        talk_content = talk_page.text
    else:
        talk_content = f"关于'{topic_name}'的讨论页不存在或为空。"
    
    # 使用LLM分析特定讨论要点的详细内容
    analysis_data = llm_service.analyze_detailed_discussion(topic_name, debate_item, page.text, talk_content)
    
    return {
        "detailed_viewpoints": analysis_data.get("detailed_viewpoints", []),
        "discussion_content": analysis_data.get("discussion_content", "")
    }
