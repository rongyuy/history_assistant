# backend/app/services/wikipedia_service.py 
import asyncio
import httpx
import wikipediaapi
from app.services import llm_service 
from app.services.scraping_service import fetch_url_content_async
import requests
from opencc import OpenCC
from bs4 import BeautifulSoup
import re 

wiki = wikipediaapi.Wikipedia(
    user_agent='HistoryAssistant/1.0 (rongyuy@example.com)',
    language='zh',  # 使用繁体中文，后续转换为简体
    timeout=30
)

# 创建繁简转换器
cc = OpenCC('t2s')  # 繁体转简体

def convert_to_simplified(text):
    """
    将繁体字转换为简体字
    """
    if not text:
        return text
    try:
        return cc.convert(text)
    except Exception as e:
        print(f"繁简转换失败: {e}")
        return text

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
            "summary": f"抱歉，在维基百科中找不到关于'{topic_name}'的页面。",
            "timeline": []
        }

    # 1. 从LLM获取摘要和时间线
    structured_data = llm_service.generate_summary_and_timeline(topic_name, page.text)

    # 2. 直接从获取的数据中提取，并提供默认值以防万一
    summary = structured_data.get("summary", "AI未能生成摘要。")
    timeline = structured_data.get("timeline", [])
    
    # 3. 转换繁体字为简体字
    summary = convert_to_simplified(summary)
    timeline = [{"year": item.get("year", ""), "event": convert_to_simplified(item.get("event", ""))} for item in timeline]
    
    # 4. 组合最终结果
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
            "debates": [f"抱歉，在维基百科中找不到关于'{topic_name}'的页面。"],
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
    
    # 4. 转换繁体字为简体字
    # 转换faction_roles
    converted_faction_roles = []
    for faction in faction_roles:
        converted_faction = {
            "faction_name": convert_to_simplified(faction.get("faction_name", "")),
            "roles": []
        }
        for role in faction.get("roles", []):
            converted_role = {
                "type": convert_to_simplified(role.get("type", "")),
                "description": convert_to_simplified(role.get("description", ""))
            }
            converted_faction["roles"].append(converted_role)
        converted_faction_roles.append(converted_faction)
    
    # 转换viewpoints
    converted_viewpoints = [{"side": convert_to_simplified(vp.get("side", "")), "text": convert_to_simplified(vp.get("text", ""))} for vp in viewpoints]
    
    # 转换debates
    converted_debates = [convert_to_simplified(debate) for debate in debates]
    
    # 转换讨论页内容
    converted_talk_content = convert_to_simplified(talk_content)
    
    # 5. 将所有数据合并到最终的返回结果中
    return {
        "faction_roles": converted_faction_roles,
        "viewpoints": converted_viewpoints,
        "debates": converted_debates,
        "full_discussion": converted_talk_content
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

# 【新增】一个辅助函数，用于将维基标记语言的链接转为HTML
def convert_wiki_links_to_html(text: str) -> str:
    """
    将维基百科的内部链接标记 [[页面标题|显示文本]] 或 [[链接]] 转换为HTML的<a>标签
    """
    if not text:
        return ""

    def replacer(match):
        full_match = match.group(0)
        # 简单处理，避免转换文件和分类链接
        if full_match.startswith('[[File:') or full_match.startswith('[[Category:'):
            return "" # 直接移除文件和分类链接

        parts = match.group(1).split('|')
        page_title = parts[0].strip()
        display_text = parts[-1].strip()
        
        # 将页面标题转换为URL路径格式
        href = f"/wiki/{page_title.replace(' ', '_')}"
        
        return f'<a href="{href}" title="{page_title}">{display_text}</a>'

    # 正则表达式匹配维基链接
    text = re.sub(r'\[\[([^\]]+)\]\]', replacer, text)
    return text

def get_wiki_structured_content(topic_name: str) -> dict:
    """
    获取维基百科页面的完整内容，并按章节进行结构化，同时保留内部链接。
    """
    page = wiki.page(topic_name)

    if not page.exists():
        return {
            "title": f"抱歉，在维基百科中找不到关于'{topic_name}'的页面。",
            "content": [],
            "url": ""
        }
    
    # 递归函数，用于提取章节
    def extract_sections_recursive(section, level):
        title = convert_to_simplified(section.title)
        
        # --- 【核心修正逻辑开始】 ---
        
        # 1. 获取当前分区的完整文本 (包含所有子分区)
        full_text = section.text
        
        # 2. 获取所有直接子分区的文本
        children_text = ''.join(s.text for s in section.sections)
        
        # 3. 从完整文本中移除所有子分区的文本，从而得到只属于当前分区自己的文本
        #    我们还移除了标题自身，因为它会重复出现在文本开头
        parent_only_text = full_text.replace(children_text, '').replace(section.title, '').strip()

        # 4. 对只属于父分区自己的文本进行链接转换和繁简转换
        text_with_links = convert_wiki_links_to_html(parent_only_text)
        simplified_text = convert_to_simplified(text_with_links)

        # --- 【核心修正逻辑结束】 ---

        sections_list = []
        # 只有当父分区确实有自己的文本时，才把它作为一个独立的条目添加
        if simplified_text:
            sections_list.append({
                'title': title,
                'html_content': simplified_text,
                'level': level,
            })
        # 如果父分区没有独立文本（只是一个容器），也继续处理它的子分区
        # 这种情况通常发生在主标题下直接就是子标题
        elif not sections_list and section.sections:
             sections_list.append({
                'title': title,
                'html_content': '', # 内容为空
                'level': level,
            })

        # 递归处理所有子章节
        for s in section.sections:
            sections_list.extend(extract_sections_recursive(s, level + 1))
            
        return sections_list

    # --- 从根页面开始提取 ---
    structured_content = []
    
    # 1. 添加摘要
    summary_raw_text = page.summary
    summary_with_links = convert_wiki_links_to_html(summary_raw_text)
    simplified_summary = convert_to_simplified(summary_with_links)
    if simplified_summary:
        structured_content.append({
            'title': '摘要',
            'html_content': simplified_summary,
            'level': 1,
        })

    # 2. 递归提取所有章节
    for s in page.sections:
        # 过滤掉参考文献等不需要的章节
        unwanted = ["参考文献", "参考资料", "外部链接", "参见"]
        if convert_to_simplified(s.title) not in unwanted:
            structured_content.extend(extract_sections_recursive(s, 1))
            
    return {
        "title": convert_to_simplified(page.title),
        "content": structured_content,
        "url": page.fullurl
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
            "discussion_content": f"抱歉，在维基百科中找不到关于'{topic_name}'的页面。"
        }
    
    # 准备讨论页内容
    talk_content = ""
    if talk_page.exists():
        talk_content = talk_page.text
    else:
        talk_content = f"关于'{topic_name}'的讨论页不存在或为空。"
    
    # 使用LLM分析特定讨论要点的详细内容
    analysis_data = llm_service.analyze_detailed_discussion(topic_name, debate_item, page.text, talk_content)
    
    # 转换繁体字为简体字
    detailed_viewpoints = []
    for viewpoint in analysis_data.get("detailed_viewpoints", []):
        converted_viewpoint = {
            "side": convert_to_simplified(viewpoint.get("side", "")),
            "text": convert_to_simplified(viewpoint.get("text", "")),
            "evidence": convert_to_simplified(viewpoint.get("evidence", ""))
        }
        detailed_viewpoints.append(converted_viewpoint)
    
    return {
        "detailed_viewpoints": detailed_viewpoints,
        "discussion_content": convert_to_simplified(analysis_data.get("discussion_content", ""))
    }
