# backend/app/services/wikipedia_service.py 

import asyncio
import httpx
import wikipediaapi
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from app.services import llm_service 
from app.services.scraping_service import fetch_url_content_async
import requests
from opencc import OpenCC
from bs4 import BeautifulSoup
import re 
import os
import json

wiki = wikipediaapi.Wikipedia(
    user_agent='HistoryAssistant/1.0 (rongyuy@example.com)',
    language='zh',
    extract_format=wikipediaapi.ExtractFormat.HTML, 
    timeout=30
)

#创建繁简转换器
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

# 【新增功能】获取维基百科官方的悬浮窗预览内容 (Page Preview API)
def get_wiki_preview_summary(topic_name: str) -> dict:
    """
    调用 MediaWiki API 获取条目的预览摘要，速度极快。
    这将替换掉原来缓慢的AI摘要生成。
    """
    session = requests.Session()
    url = "https://zh.wikipedia.org/w/api.php"
    params = {
        "action": "query",
        "format": "json",
        "prop": "extracts",  # 获取摘要
        "exintro": True,      # 只获取引言部分
        "explaintext": True,  # 以纯文本形式返回
        "redirects": 1,       # 自动处理重定向
        "titles": topic_name
    }
    headers = {'User-Agent': 'HistoryAssistant/1.0 (rongyuy@example.com)'}

    try:
        response = session.get(url=url, params=params, headers=headers, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        pages = data.get("query", {}).get("pages", {})
        if not pages:
            return {"summary": "未找到相关条目。"}

        # API返回的page id是动态的，所以需要遍历来获取
        for page_id, page_data in pages.items():
            if page_id == "-1": # "-1" 表示页面不存在
                return {"summary": f"在维基百科中找不到关于 '{topic_name}' 的页面。"}
            
            summary = page_data.get("extract")
            if summary:
                # 返回简体中文摘要
                return {"summary": convert_to_simplified(summary)}
        
        return {"summary": "无法提取摘要。"}

    except requests.RequestException as e:
        print(f"调用维基百科预览API失败: {e}")
        return {"summary": "网络请求失败，无法获取预览。"}

# 【新功能】直接从 MediaWiki API 获取原始 wikitext
def get_raw_wikitext(topic_name: str) -> str:
    """
    通过直接调用 MediaWiki API 来获取页面的原始 wikitext。
    """
    S = requests.Session()
    URL = "https://zh.wikipedia.org/w/api.php"
    
    PARAMS = {
        "action": "query",
        "prop": "revisions",
        "rvprop": "content",
        "titles": topic_name,
        "format": "json",
        "formatversion": "2"
    }
    HEADERS = {'User-Agent': 'HistoryAssistant/1.0 (rongyuy@example.com)'}
    
    try:
        response = S.get(url=URL, params=PARAMS, headers=HEADERS, timeout=90)
        response.raise_for_status()
        data = response.json()
        
        if "query" in data and "pages" in data["query"] and data["query"]["pages"]:
            page = data["query"]["pages"][0]
            if "revisions" in page and page["revisions"]:
                # 检查是否有 content 字段
                content = page["revisions"][0].get("content")
                if content:
                    return content
    except requests.RequestException as e:
        print(f"调用MediaWiki API获取wikitext失败: {e}")
    except Exception as e:
        print(f"解析MediaWiki API wikitext响应时出错: {e}")
    
    return "" # 如果失败则返回空字符串

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

def get_wiki_structured_content(topic_name: str) -> dict:
    """
    【最终稳定修正版 v9】修复了内部链接转换的bug。
    """
    session = requests.Session()
    url = "https://zh.wikipedia.org/w/api.php"
    params = {"action": "parse", "page": topic_name, "prop": "text|displaytitle", "format": "json", "formatversion": "2"}
    headers = {'User-Agent': 'HistoryAssistant/1.0 (your-email@example.com)'}
    try:
        response = session.get(url=url, params=params, headers=headers, timeout=30)
        response.raise_for_status()
        data = response.json()
        if "error" in data:
            return {"title": f"找不到页面: '{topic_name}'", "summary": data["error"]["info"], "content": [], "url": ""}
        page_title = data["parse"]["displaytitle"]
        page_id = data["parse"]["pageid"]
        page_url = f"https://zh.wikipedia.org/?curid={page_id}"
        full_html = data.get("parse", {}).get("text")
        if not full_html:
            return {"title": convert_to_simplified(page_title), "summary": "此页面不包含可解析的正文内容。", "content": [], "url": page_url}
        soup = BeautifulSoup(full_html, 'html.parser')
        unwanted_selectors = ['.mw-editsection', '.noprint', '.mw-jump-link','.infobox', '.metadata', '.ambox', '.hatnote','.navbox', '.thumb', '.reflist', '#toc', '.sidebar', '.reference', '.gallery', 'table.mbox-small-left', 'style']
        for selector in unwanted_selectors:
            for tag in soup.select(selector):
                tag.decompose()
        for ref in soup.find_all("sup", class_="reference"):
            ref.decompose()
        
        # --- ▼▼▼ 核心修复：移除了错误的 if ':' not in a['href'] 判断 ▼▼▼ ---
        for a in soup.find_all('a', href=re.compile(r'^/wiki/')):
            a['href'] = 'https://zh.wikipedia.org' + a['href']
            a['target'] = '_blank'
            a['rel'] = 'noopener noreferrer'
        # --- ▲▲▲ 核心修复结束 ▲▲▲ ---

        content_div = soup.find('div', class_='mw-parser-output')
        if not content_div:
            return {"title": convert_to_simplified(page_title), "summary": "无法找到页面的主内容区域。", "content": [], "url": page_url}
        structured_content = []
        unwanted_titles = ["参考文献", "参考资料", "外部链接", "参见", "註釋", "研究書目"]
        current_section = { "level": 2, "title": "摘要", "id": "summary-section", "html_content": "" }
        structured_content.append(current_section)
        for element in content_div.find_all(recursive=False):
            heading_tag = None
            if element.name in ['h2', 'h3', 'h4', 'h5', 'h6']:
                heading_tag = element
            elif element.find(['h2', 'h3', 'h4', 'h5', 'h6']):
                heading_tag = element.find(['h2', 'h3', 'h4', 'h5', 'h6'])
            if heading_tag:
                title = heading_tag.get_text(strip=True)
                section_id = heading_tag.get('id')
                if not section_id:
                    section_id = f"section-{title.replace(' ', '_')}"
                    heading_tag['id'] = section_id
                if title:
                    simplified_title = convert_to_simplified(title)
                    if simplified_title in unwanted_titles: break
                    if not any(d.get('title') == simplified_title for d in structured_content):
                        new_section = {"level": int(heading_tag.name[1]), "title": simplified_title, "id": section_id or title.replace(" ", "_"), "html_content": ""}
                        structured_content.append(new_section)
                        current_section = new_section
                else:
                    current_section["html_content"] += str(element)
            else:
                current_section["html_content"] += str(element)
        final_content = []
        for section in structured_content:
            section["html_content"] = convert_to_simplified(section["html_content"].strip())
            if section['title'] == "摘要" and not section['html_content']:
                continue
            final_content.append(section)
        final_data = {"title": convert_to_simplified(page_title), "content": final_content, "url": page_url}
        return final_data
    except Exception as e:
        return {"title": "后端处理错误", "summary": f"解析维基百科页面时发生错误: {e}", "content": [], "url": ""} 


def get_wiki_discussion_structured_content(topic_name: str) -> dict:
    """
    【最终修复版】修复了标题识别逻辑和内部链接转换，确保稳定解析并生成目录。
    """
    session = requests.Session()
    retry_strategy = Retry(total=3, backoff_factor=1, status_forcelist=[429, 500, 502, 503, 504], allowed_methods=["HEAD", "GET", "OPTIONS"])
    adapter = HTTPAdapter(max_retries=retry_strategy)
    session.mount("https://", adapter)
    session.mount("http://", adapter)

    url = "https://zh.wikipedia.org/w/api.php"
    params = {"action": "parse", "page": f"Talk:{topic_name}", "prop": "text|displaytitle", "format": "json", "formatversion": "2"}
    headers = {'User-Agent': 'HistoryAssistant/1.0 (your-email@example.com)'}

    try:
        response = session.get(url=url, params=params, headers=headers, timeout=30)
        response.raise_for_status()
        data = response.json()

        if "error" in data:
            return {"title": f"找不到页面: '讨论:{topic_name}'", "content": [], "url": "", "toc": []}

        page_title = data["parse"]["displaytitle"]
        page_id = data["parse"]["pageid"]
        page_url = f"https://zh.wikipedia.org/?curid={page_id}"
        full_html = data.get("parse", {}).get("text", "")

        if not full_html:
            return {"title": convert_to_simplified(page_title), "content": [], "url": page_url, "toc": []}

        soup = BeautifulSoup(full_html, 'html.parser')
        
        for edit_section in soup.select('.mw-editsection'):
            edit_section.decompose()
        unwanted_selectors = ['.noprint', '.mw-jump-link','.infobox', '.metadata', '.ambox', '.hatnote','.navbox', '.thumb', '.reflist', '.sidebar', '.reference', '.gallery', 'table.mbox-small-left', 'style', '.tmbox']
        for selector in unwanted_selectors:
            for tag in soup.select(selector):
                tag.decompose()
        
        # --- ▼▼▼ 核心修复：移除了错误的 if ':' not in a['href'] 判断 ▼▼▼ ---
        for a in soup.find_all('a', href=re.compile(r'^/wiki/')):
            a['href'] = 'https://zh.wikipedia.org' + a['href']
            a['target'] = '_blank'
            a['rel'] = 'noopener noreferrer'
        # --- ▲▲▲ 核心修复结束 ▲▲▲ ---

        content_div = soup.find('div', class_='mw-parser-output')
        if not content_div:
            return {"title": convert_to_simplified(page_title), "content": [], "url": page_url, "toc": []}

        structured_content = []
        unwanted_titles = ["参考文献", "参考资料", "外部链接", "参见", "註釋", "研究書目"]
        current_section = None

        for element in content_div.find_all(recursive=False):
            heading_tag = None
            if element.name in ['h2', 'h3', 'h4', 'h5', 'h6']:
                heading_tag = element
            elif element.name == 'div' and element.find(['h2', 'h3', 'h4', 'h5', 'h6']):
                 heading_tag = element.find(['h2', 'h3', 'h4', 'h5', 'h6'])

            if heading_tag:
                title = heading_tag.get_text(strip=True)
                section_id = heading_tag.get('id') or f"section-{re.sub(r'[^a-zA-Z0-9_-]', '', title.replace(' ', '_'))}"
                
                if title:
                    simplified_title = convert_to_simplified(title)
                    if simplified_title in unwanted_titles: break
                    
                    current_section = {
                        "level": int(heading_tag.name[1]),
                        "title": simplified_title,
                        "id": section_id,
                        "html_content": ""
                    }
                    structured_content.append(current_section)
            else:
                if current_section:
                    current_section["html_content"] += str(element)
        
        for section in structured_content:
            section["html_content"] = convert_to_simplified(section["html_content"].strip())

        toc_list = [
            {"level": section["level"], "title": section["title"], "anchor_link": f"#{section['id']}"}
            for section in structured_content
        ]
        
        return {
            "title": convert_to_simplified(page_title),
            "toc": toc_list,
            "content": structured_content, 
            "url": page_url
        }

    except Exception as e:
        return {"title": "后端处理错误", "content": [{"title": "错误", "id":"error-section", "html_content": f"解析维基百科页面时发生意外错误: {e}"}], "url": "", "toc": []}


    
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
