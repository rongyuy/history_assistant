# backend/app/services/scraping_service.py

import requests
import trafilatura
import io
import re
from urllib.parse import urlparse, unquote
from pypdf import PdfReader
import httpx
import asyncio
from bs4 import BeautifulSoup

# 伪装成一个常见的浏览器,防止被一些网站拦截
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
}

# ▼▼▼ 新增的核心修复函数 ▼▼▼
def _sanitize_title(title: str) -> str:
    """
    一个健壮的标题净化函数，专门用于检测和修复双重编码（mojibake）问题。
    """
    if not title or title.isspace():
        return ""

    try:
        # 尝试修复最常见的 Mojibake: UTF-8 文本被错误地用 latin-1 解码
        # 如果修复成功，说明原文是乱码，我们返回修复后的文本
        fixed_title = title.encode('latin1').decode('utf-8')
        
        # 修复后可能还有问题，比如 "ï»¿" (UTF-8 BOM)，一并移除
        # 同时移除 Unicode 替换字符
        return fixed_title.replace('\ufeff', '').replace('\ufffd', '').strip()
    except (UnicodeEncodeError, UnicodeDecodeError):
        # 如果尝试修复失败，说明原始标题可能不是这种特定类型的乱码
        # 我们就直接返回原文，但同样移除已知的坏字符
        return title.replace('\ufeff', '').replace('\ufffd', '').strip()
# ▲▲▲ 新增函数结束 ▲▲▲


# --- 同步函数 ---
def fetch_html_content(url: str) -> dict:
    """同步抓取HTML，并使用新的净化函数处理标题。"""
    try:
        response = requests.get(url, headers=HEADERS, timeout=15)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        raw_title = soup.title.string if soup.title and soup.title.string else "无标题文档"
        
        # 使用净化函数处理标题
        title = _sanitize_title(raw_title) or "无标题文档"

        content = trafilatura.extract(response.content, favor_recall=True)
        
        if content and len(content) > 100:
            return {"success": True, "type": "text", "title": title, "content": content, "url": url}
        else:
            return {"success": False, "title": title, "message": "无法自动提取有效正文。", "url": url}
    except requests.RequestException as e:
        return {"success": False, "title": "请求失败", "message": f"无法访问链接: {e}", "url": url}
    except Exception as e:
        return {"success": False, "title": "处理错误", "message": f"处理时发生未知错误: {e}", "url": url}


# --- 异步函数 ---
async def fetch_url_content_async(client: httpx.AsyncClient, url: str) -> dict:
    """主调度函数(异步)"""
    print(f"Scraping Service (Async): Fetching URL: {url}")
    try:
        parsed_url = urlparse(url.lower())
        path = parsed_url.path
        if any(path.endswith(ext) for ext in ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx']):
             return {"success": False, "url": url, "title": "不支持的格式", "message": f"文件格式 ({path.split('.')[-1]}) 不支持内容提取。"}

        if path.endswith('.pdf'):
            return await fetch_pdf_content_async(client, url)
        else:
            return await fetch_html_content_async(client, url)
    except Exception as e:
        return {"success": False, "url": url, "title": "解析URL失败", "message": f"URL解析或抓取时发生意外错误: {e}"}

async def fetch_html_content_async(client: httpx.AsyncClient, url: str) -> dict:
    """异步抓取HTML，并使用新的净化函数处理标题。"""
    try:
        response = await client.get(url, headers=HEADERS, timeout=15)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        raw_title = soup.title.string if soup.title and soup.title.string else "无标题文档"
        
        # 使用净化函数处理标题
        title = _sanitize_title(raw_title) or "无标题文档"

        content = trafilatura.extract(response.content, favor_recall=True)

        if content and len(content) > 100:
            return {"success": True, "type": "text", "title": title, "content": content, "url": url}
        else:
            return {"success": False, "title": title, "message": "无法自动提取有效正文。", "url": url}
    except httpx.RequestError as e:
        return {"success": False, "title": "请求失败", "message": f"无法访问链接: {type(e).__name__}", "url": url}
    except Exception as e:
        return {"success": False, "title": "处理错误", "message": f"处理时发生未知错误: {e}", "url": url}

async def fetch_pdf_content_async(client: httpx.AsyncClient, url: str) -> dict:
    """异步抓取PDF，并对标题进行更健壮的净化和备用处理。"""
    try:
        response = await client.get(url, headers=HEADERS, timeout=30)
        response.raise_for_status()

        pdf_file = io.BytesIO(response.content)
        reader = PdfReader(pdf_file)
        
        raw_title = ""
        if reader.metadata and reader.metadata.title:
            raw_title = reader.metadata.title
        
        # 1. 首先对从元数据中获取的标题进行净化
        title = _sanitize_title(raw_title)
        
        # 2. 如果净化后的标题为空，或者不包含任何有效字符，则从URL回退
        if not title or not re.search(r'[\u4e00-\u9fa5a-zA-Z0-9]', title):
            try:
                path = urlparse(url).path
                filename = unquote(path).split('/')[-1]
                title = filename if filename else "PDF文档（标题未知）"
            except Exception:
                title = "PDF文档（标题提取失败）"

        full_text = "".join(page.extract_text() + "\n\n" for page in reader.pages if page.extract_text())

        if full_text:
            return {"success": True, "type": "pdf_text", "title": title, "content": full_text, "url": url}
        else:
            return {"success": False, "title": title, "message": "无法从PDF提取文本。", "url": url}
    except httpx.RequestError as e:
        return {"success": False, "title": "PDF下载失败", "message": f"下载PDF失败: {type(e).__name__}", "url": url}
    except Exception as e:
        return {"success": False, "title": "PDF解析失败", "message": f"解析PDF时出错: {e}", "url": url}