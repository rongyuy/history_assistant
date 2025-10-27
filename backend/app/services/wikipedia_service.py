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
import random 
import re 
import os
import json
from typing import List, Dict # 确保导入 List 和 Dict

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
    
def is_garbled(text: str) -> bool:
    """
    一个健壮的乱码检测函数。
    如果文本中不包含任何可识别的字符（中文、英文、数字），则判定为乱码。
    """
    if not text or text.isspace():
        return False
    
    # U+FFFD () 是 Unicode 的替换字符，是乱码的明确标志
    if '\ufffd' in text:
        return True
        
    # 如果字符串中连一个中文字符、英文字母或数字都找不到，
    # 那么它极大概率是无法阅读的乱码。
    if not re.search(r'[\u4e00-\u9fa5a-zA-Z0-9]', text):
        return True
        
    return False

# ▼▼▼ 新增一个内部辅助函数，专门用于获取与前端一致的纯文本 ▼▼▼
def _get_simplified_clean_text(topic_name: str) -> str:
    """
    获取维基百科页面的HTML，清理后提取纯文本，并转换为简体中文。
    这是为了确保LLM分析的文本源和前端展示的源头一致。
    """
    session = requests.Session()
    url = "https://zh.wikipedia.org/w/api.php"
    params = {"action": "parse", "page": topic_name, "prop": "text", "format": "json", "formatversion": "2"}
    headers = {'User-Agent': 'HistoryAssistant/1.0 (your-email@example.com)'}
    try:
        response = session.get(url=url, params=params, headers=headers, timeout=30)
        response.raise_for_status()
        data = response.json()
        if "error" in data:
            return ""
        
        full_html = data.get("parse", {}).get("text")
        if not full_html:
            return ""

        soup = BeautifulSoup(full_html, 'html.parser')
        
        # 使用与 get_wiki_structured_content 相同的清理规则
        unwanted_selectors = ['.mw-editsection', '.noprint', '.mw-jump-link','.infobox', '.metadata', '.ambox', '.hatnote','.navbox', '.thumb', '.reflist', '#toc', '.sidebar', '.reference', '.gallery', 'table.mbox-small-left', 'style']
        for selector in unwanted_selectors:
            for tag in soup.select(selector):
                tag.decompose()
        for ref in soup.find_all("sup", class_="reference"):
            ref.decompose()

        content_div = soup.find('div', class_='mw-parser-output')
        if not content_div:
            return ""
        
        # 提取纯文本并进行繁简转换
        plain_text = content_div.get_text(separator='', strip=True)
        return convert_to_simplified(plain_text)

    except Exception as e:
        print(f"获取和清理维基百科纯文本时出错: {e}")
        return ""
# ▲▲▲ 新增函数结束 ▲▲▲

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

# --- 这里是您原来被我不慎遗漏的函数，现在已恢复 ---
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
# --- 函数恢复结束 ---


# ▼▼▼ 这是被修改的核心函数 ▼▼▼
def get_topic_data(topic_name: str) -> dict:
    page = wiki.page(topic_name)

    if not page.exists():
        return {
            "summary": f"抱歉，在维基百科中找不到关于'{topic_name}'的页面。",
            "timeline": []
        }

    # 1. 【核心修改】使用新的辅助函数获取与前端一致的、清理过的简体中文纯文本
    print(f"Wikipedia Service: Fetching and cleaning content for '{topic_name}' to be used by LLM...")
    clean_simplified_text = _get_simplified_clean_text(topic_name)
    
    if not clean_simplified_text:
        # 如果获取失败，回退到老方法，但这可能导致source_text不匹配
        print(f"Warning: Failed to get clean text for '{topic_name}'. Falling back to page.text.")
        clean_simplified_text = convert_to_simplified(page.text)

    # 2. 将这份干净的、与前端同源的文本传递给LLM进行分析
    structured_data = llm_service.generate_summary_and_timeline(topic_name, clean_simplified_text)

    # 3. 直接从LLM的返回数据中提取摘要和时间线
    summary = structured_data.get("summary", "AI未能生成摘要。")
    timeline = structured_data.get("timeline", [])
    
    # 4. 对LLM返回的所有文本内容进行最终的繁简转换，作为双重保险
    summary = convert_to_simplified(summary)
    
    converted_timeline = []
    for item in timeline:
        converted_item = {
            "year": item.get("year", ""),
            "event": convert_to_simplified(item.get("event", "")),
            "source_text": convert_to_simplified(item.get("source_text", ""))
        }
        converted_timeline.append(converted_item)

    # 5. 组合并返回最终结果
    return {
        "summary": summary,
        "timeline": converted_timeline
    }
# ▲▲▲ 修改结束 ▲▲▲


# --- 以下是您其余的、未做任何修改的函数 ---

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
    
    # 2. 调用原有的LLM服务，分析对立观点和讨论页内容
    analysis_data = llm_service.analyze_viewpoints_and_debates(topic_name, page.text, talk_content)
    
    # 3. 从两次调用中分别提取所需数据
    viewpoints = analysis_data.get("viewpoints", [])
    debates = analysis_data.get("debates", [])
    
    
    # 转换viewpoints
    converted_viewpoints = [{"side": convert_to_simplified(vp.get("side", "")), "text": convert_to_simplified(vp.get("text", ""))} for vp in viewpoints]
    
    # 转换debates
    converted_debates = [convert_to_simplified(debate) for debate in debates]
    
    # 转换讨论页内容
    converted_talk_content = convert_to_simplified(talk_content)
    
    # 5. 将所有数据合并到最终的返回结果中
    return {
        "viewpoints": converted_viewpoints,
        "debates": converted_debates,
        "full_discussion": converted_talk_content
    }

# 【核心修改】将 get_references_with_content 完全改造为异步并行模式
async def get_references_with_content_async(topic_name: str, limit: int = 40) -> list:
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
    获取多源史料对比，并在此处对所有抓取结果的标题和正文进行最终的乱码过滤。
    """
    all_scraped_contents = asyncio.run(get_references_with_content_async(topic_name, limit=40))
    
    # 【最终核心修复】在处理所有数据之前，使用 is_garbled 函数对标题和正文同时进行过滤
    # 只有标题和正文都不是乱码的文献才会被保留
    filtered_contents = []
    for item in all_scraped_contents:
        if not item:
            continue

        title = item.get("title", "")
        content = item.get("content", "")

        # 只要标题是乱码，就立即丢弃
        if is_garbled(title):
            print(f"Filtering out due to garbled title: {title[:70]}")
            continue
        
        # 如果有正文，且正文是乱码，也丢弃
        if content and is_garbled(content):
            print(f"Filtering out due to garbled content (Title: {title})")
            continue
        
        # 通过所有检查的，才是合格的文献
        filtered_contents.append(item)
    
    # 后续的所有操作都基于这个干净的、经过双重过滤的列表
    successful_contents = [
        item for item in filtered_contents 
        if item.get("success") and item.get("content")
    ]
    
    # 对过滤后的成功内容进行随机排序，以增加AI对比的多样性
    random.shuffle(successful_contents)

    comparison_data = llm_service.generate_source_comparison(topic_name, successful_contents)

    # 仅为成功且内容不为空的文献生成摘要
    for item in successful_contents:
        item['content'] = llm_service.summarize_reference_content(item['content'])

    # 在最终返回的 "references" 字段中，我们只使用过滤后的、成功的文献列表
    return {
        "sources": comparison_data.get("sources", []),
        "references": successful_contents
    }

# ▼▼▼ 在文件末尾添加这个新函数 ▼▼▼
def regenerate_source_comparison_from_list(topic: str, source_list: List[Dict[str, str]]) -> dict:
    """
    接收一个已有的参考文献列表（通常是2个），并直接调用LLM服务为它们生成对读内容。
    这个函数不执行任何网络爬取或过滤。
    """
    print(f"Wikipedia Service: Regenerating comparison for topic '{topic}' with {len(source_list)} provided sources.")
    # 直接调用LLM服务，因为列表已经是前端筛选好的
    comparison_data = llm_service.generate_source_comparison(topic, source_list)
    # 返回的数据结构与LLM服务返回的完全一致
    return comparison_data
# ▲▲▲ 新函数结束 ▲▲▲


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
    # --- ▼▼▼ 核心修改区域：数据准备方式完全重构 ▼▼▼ ---
    
    # 1. 不再使用 .text，而是直接获取结构化的讨论页内容
    structured_talk_data = get_wiki_discussion_structured_content(topic_name)
    
    # 2. 检查获取是否成功，以及内容是否存在
    if not structured_talk_data or not structured_talk_data.get("content"):
        return {
            "detailed_viewpoints": [],
            "discussion_content": f"未能找到或解析关于'{topic_name}'的讨论页。",
            "source_sections": [],
        }

    # 3. 将结构化内容格式化为AI易于理解的、带清晰标题的文本
    formatted_talk_content = ""
    for section in structured_talk_data["content"]:
        title = section.get("title", "").strip()
        soup = BeautifulSoup(section.get("html_content", ""), 'html.parser')
        content_text = soup.get_text(" ", strip=True)
        
        if title and content_text:
            formatted_talk_content += f"== {title} ==\n{content_text}\n\n"

    # 4. 如果格式化后内容为空，也提前返回
    if not formatted_talk_content.strip():
         return {
            "detailed_viewpoints": [],
            "discussion_content": "讨论页内容为空，无法进行分析。",
            "source_sections": []
        }

    # 5. 获取主页面内容（作为辅助参考，但AI主要依赖讨论页）
    page = wiki.page(topic_name)
    main_page_text = page.text if page.exists() else ""

    # --- ▲▲▲ 核心修改区域结束 ▲▲▲ ---

    # 【修改调用】将获取到的阵营名称列表传递给AI
    analysis_data = llm_service.analyze_detailed_discussion(
        topic_name, 
        debate_item, 
        main_page_text, 
        formatted_talk_content
    )
    
    # (下面的数据处理逻辑保持不变)
    detailed_viewpoints = []
    for viewpoint in analysis_data.get("detailed_viewpoints", []):
        converted_viewpoint = {
            "side": convert_to_simplified(viewpoint.get("side", "")),
            "text": convert_to_simplified(viewpoint.get("text", "")),
            "evidence": convert_to_simplified(viewpoint.get("evidence", ""))
        }
        detailed_viewpoints.append(converted_viewpoint)
    
    source_sections = [convert_to_simplified(section) for section in analysis_data.get("source_sections", [])]
    
    print(f"AI 参考的讨论页章节标题: {source_sections}")
    
    # 【修改返回】在最终返回的字典中加入关联阵营
    return {
        "detailed_viewpoints": detailed_viewpoints,
        "discussion_content": convert_to_simplified(analysis_data.get("discussion_content", "")),
        "source_sections": source_sections
    }

def refresh_debate_points(topic_name: str, existing_debates: List[str]) -> dict: # <-- 增加参数
    """
    一个专门的函数，只用于重新生成维基讨论页的争议要点。
    """
    print(f"Wikipedia Service: Refreshing debate points for '{topic_name}', excluding {len(existing_debates)} items.")
    page = wiki.page(topic_name)
    if not page.exists():
        return {"debates": [f"找不到关于'{topic_name}'的页面。"]}

    talk_page = wiki.page(f"讨论:{topic_name}")
    talk_content = talk_page.text if talk_page.exists() else f"关于'{topic_name}'的讨论页不存在。"

    # 核心：调用LLM服务时，传入需要排除的列表
    analysis_data = llm_service.analyze_viewpoints_and_debates(
        topic_name, 
        page.text, 
        talk_content,
        exclude_debates=tuple(existing_debates) # <-- 传入新参数
    )

    # ... (后面的提取和转换逻辑不变) ...
    debates = analysis_data.get("debates", [])
    converted_debates = [convert_to_simplified(debate) for debate in debates]

    print(f"Successfully refreshed {len(converted_debates)} new debate points.")
    return {"debates": converted_debates}

def create_timeline_event_from_selection(topic: str, text_snippet: str) -> dict:
    """
    统筹创建时间线事件的完整流程：
    【V3 - 仅使用 RegEx 提取版】
    1. 优先使用正则表达式检查精确或模糊时间 (e.g., "1935年10月", "1935年秋", "1935年").
    2. 如果找到，直接使用。
    3. 如果找不到，时间字段留空 ("")。
    4. 永远不使用AI进行网络搜索或精炼时间。
    5. 始终使用AI总结事件描述。
    """
    
    final_year = ""
    
    # 这个RegEx会按顺序尝试匹配:
    # 1. "YYYY年M月"
    # 2. "YYYY年[春/夏/秋/冬]季?"
    # 3. "YYYY年"
    # 它会获取最长的有效匹配
    # (?:...) 是一个非捕获组
    date_match = re.search(
        r'(\d{4}年(?:(?:\d{1,2}月)|(?:[\u6625\u590F\u79CB\u51AC]季?))?)', 
        text_snippet
    )

    if date_match:
        final_year = date_match.group(1)
        print(f"RegEx V3 找到了时间: {final_year}")
    else:
        print("RegEx V3 未找到任何时间，时间将留空。")

    # 无论是否找到时间，都调用AI *只* 总结事件
    # (这是我们在上一版中添加的函数，现在是主力)
    event_desc = llm_service.summarize_event_from_text_only(text_snippet)

    # 组装最终结果
    final_event = {
        "year": convert_to_simplified(final_year),
        "event": convert_to_simplified(event_desc),
        "source_text": text_snippet
    }

    return final_event