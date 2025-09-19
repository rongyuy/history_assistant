# backend/app/services/scraping_service.py

import requests
import trafilatura
import io
from urllib.parse import urlparse
from pypdf import PdfReader
import httpx  # 导入 httpx
import asyncio # 导入 asyncio

# 伪装成一个常见的浏览器,防止被一些网站拦截
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
}

# --- 原有的同步函数保持不变，以备其他地方可能的使用 ---

def fetch_html_content(url: str) -> dict:
    """第一层:使用requests + trafilatura 抓取HTML网页。"""
    try:
        response = requests.get(url, headers=HEADERS, timeout=15)
        response.raise_for_status()
        if response.encoding != response.apparent_encoding:
            response.encoding = response.apparent_encoding
        content = trafilatura.extract(response.text, favor_recall=True)
        if content and len(content) > 200:
            return {"success": True, "type": "text", "content": content, "url": url}
        else:
            return {"success": False, "message": "无法自动提取有效正文,可能需要登录或页面结构复杂。", "url": url}
    except requests.RequestException as e:
        return {"success": False, "message": f"无法访问该链接: {e}", "url": url}
    except Exception as e:
        return {"success": False, "message": f"处理时发生未知错误: {e}", "url": url}

# --- 新增：异步版本的抓取函数 ---

async def fetch_url_content_async(client: httpx.AsyncClient, url: str) -> dict:
    """
    主调度函数(异步),根据URL类型选择合适的抓取方法。
    """
    print(f"Scraping Service (Async): Fetching URL: {url}")
    try:
        if url.lower().endswith('.pdf'):
            return await fetch_pdf_content_async(client, url)
        else:
            return await fetch_html_content_async(client, url)
    except Exception as e:
        return {"success": False, "url": url, "message": f"URL解析或抓取时发生意外错误: {e}"}

async def fetch_html_content_async(client: httpx.AsyncClient, url: str) -> dict:
    """异步抓取HTML网页"""
    try:
        response = await client.get(url, headers=HEADERS, timeout=15)
        response.raise_for_status()
        
        # httpx 自动处理编码更好，通常不需要手动修正
        
        content = trafilatura.extract(response.text, favor_recall=True)
        if content and len(content) > 200:
            return {"success": True, "type": "text", "content": content, "url": url}
        else:
            return {"success": False, "message": "无法自动提取有效正文。", "url": url}
    except httpx.RequestError as e:
        return {"success": False, "message": f"无法访问该链接: {type(e).__name__}", "url": url}
    except Exception as e:
        return {"success": False, "message": f"处理时发生未知错误: {e}", "url": url}

async def fetch_pdf_content_async(client: httpx.AsyncClient, url: str) -> dict:
    """异步抓取PDF文件"""
    try:
        response = await client.get(url, headers=HEADERS, timeout=30)
        response.raise_for_status()

        pdf_file = io.BytesIO(response.content)
        reader = PdfReader(pdf_file)
        full_text = "".join(page.extract_text() + "\n\n" for page in reader.pages)

        if full_text:
            return {"success": True, "type": "pdf_text", "content": full_text, "url": url}
        else:
            return {"success": False, "message": "无法从PDF提取文本。", "url": url}
    except httpx.RequestError as e:
        return {"success": False, "message": f"下载PDF失败: {type(e).__name__}", "url": url}
    except Exception as e:
        return {"success": False, "message": f"解析PDF时出错: {e}", "url": url}