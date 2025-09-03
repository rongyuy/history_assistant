#此处编写抓取网页正文的逻辑
import requests
import trafilatura
import io
from urllib.parse import urlparse
from pypdf import PdfReader


# 伪装成一个常见的浏览器,防止被一些网站拦截
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
}

def fetch_html_content(url: str) -> dict:
    """第一层:使用requests + trafilatura 抓取HTML网页。"""
    try:
        # 1.下载网页,设置超时和浏览器头
        response = requests.get(url, headers=HEADERS, timeout=15)
        # 如果服务器返回错误码(如404,500),则主动抛出异常
        response.raise_for_status()

        # --- 【核心修改点】 ---
        # 修正编码。如果 requests 库的默认解码和根据内容分析的解码不一致，
        # 就使用分析出的编码重新解码，这能大概率解决中文乱码问题。
        if response.encoding != response.apparent_encoding:
            response.encoding = response.apparent_encoding
        # --- 【修改结束】 ---

        # 2. 提取正文
        # favor_recall=True 会尝试提取更多内容,更适合我们的场景
        content = trafilatura.extract(response.text, favor_recall=True)

        # 设置一个最小长度阈值,过滤掉无效提取
        if content and len(content) > 200:
            return {"success": True, "type": "text", "content": content, "url": url}
        else:
            # 提取失败或内容过短,降级处理
            return {"success": False, "message": "无法自动提取有效正文,可能需要登录或页面结构复杂。", "url": url}
    except requests.RequestException as e:
        return {"success": False, "message": f"无法访问该链接: {e}", "url": url}
    except Exception as e:
        return {"success": False, "message": f"处理时发生未知错误: {e}", "url": url}

def fetch_pdf_content(url: str) -> dict:
    """第二层:专门处理PDF文件的链接。"""
    try:
        # PDF文件可能较大,超时设置长一点
        response = requests.get(url, headers=HEADERS, timeout=30)
        response.raise_for_status()

        # 将下载的二进制内容读入内存
        pdf_file = io.BytesIO(response.content)

        # 使用pypdf读取PDF
        reader = PdfReader(pdf_file)
        full_text = ""
        for page in reader.pages:
            full_text += page.extract_text() + "\n\n"  # 逐页提取并换行

        if full_text:
            return {"success": True, "type": "pdf_text", "content": full_text, "url": url}
        else:
            return {"success": False, "message": "这是一个PDF文件,但无法提取其中的文本(可能是图片型PDF)。", "url": url}
    except requests.RequestException as e:
        return {"success": False, "message": f"下载PDF文件失败: {e}", "url": url}
    except Exception as e:
        # pypdf可能会遇到加密或损坏的PDF
        return {"success": False, "message": f"解析PDF文件时出错: {e}", "url": url}


def fetch_url_content(url: str) -> dict:
    """
    主调度函数,根据URL类型选择合适的抓取方法。
    """
    print("Scraping Service: Fetching URL:", url)
    try:
        parsed_url = urlparse(url)
        # 检查URL是否指向一个PDF文件
        if parsed_url.path.lower().endswith('.pdf'):
            return fetch_pdf_content(url)
        else:
            return fetch_html_content(url)
    except Exception as e:
        return {"success": False, "url": url, "message": f"URL解析或抓取时发生意外错误: {e}"}