# backend/app/services/llm_service.py

import os
import json
from openai import OpenAI, APITimeoutError # 导入APITimeoutError
from app.schemas.main_schemas import AIChatRequest
from dotenv import load_dotenv

load_dotenv()

# 修改客户端初始化，增加超时设置（例如30秒）
client = OpenAI(
    api_key=os.environ.get("DEEPSEEK_API_KEY"),
    base_url="https://api.deepseek.com",
    timeout=30.0,  # <-- 增加30秒超时
)

def get_socratic_response(request: AIChatRequest) -> str:
    system_prompt = f"""
你是一名历史学领域的苏格底式导师。你的唯一目标是引导学生进行批判性思考,绝不直接提供答案。
规则:
1.  总是以提问的方式回应。
2.  你的问题应基于学生之前的回答和当前的学习材料。
3.  引导学生注意证据、识别偏见、比较不同观点。
4.  保持对话简短、有启发性、开放性,避免是非题。
5.  永远不要说“我不知道”或“我无法回答”。你的职责是基于现有信息提出引导性问题。
当前的历史探究主题是: {request.topic}
学生正处于“{request.current_module}”模块。
"""

    if request.context_text:
        system_prompt += f"\n学生正在分析以下材料:\n---\n{request.context_text}\n---"

    history_dicts = [msg.dict() for msg in request.history]
    messages = [{"role": "system", "content": system_prompt}] + history_dicts
    
    if not client.api_key:
        print("警告: DEEPSEEK_API_KEY 环境变量未设置。返回一个模拟回复。")
        return "看起来环境变量没有设置正确，你能检查一下吗？"

    try:
        response = client.chat.completions.create(
            model="deepseek-chat",
            messages=messages,
            max_tokens=150,
            temperature=0.7,
        )
        ai_response = response.choices[0].message.content
    except APITimeoutError:
        print("调用 DeepSeek API 超时。")
        ai_response = "AI思考超时了，请检查网络或稍后再试。"
    except Exception as e:
        print(f"调用 DeepSeek API 时出错: {e}")
        ai_response = "在引导你思考时我遇到了一些困难，我们可以换个角度提问吗？"

    return ai_response


def generate_summary_and_timeline(topic: str, wiki_content: str) -> dict:
    print(f"LLM Service: Generating detailed summary and timeline for {topic}...")
    
    max_length = 15000 
    if len(wiki_content) > max_length:
        wiki_content = wiki_content[:max_length] + "\n\n[内容已截断]"
        
    system_prompt = f"""
你是一名专业的历史学家助手。你的任务是阅读提供的关于“{topic}”的维基百科文章全文，并从中提取关键信息。
你的输出必须严格遵循以下JSON格式，不要添加任何额外的解释或文字。
{{
  "summary": "（这里是你生成的关于该历史事件的200字左右的摘要）",
  "timeline": [
    {{ "year": "（年份或日期）", "event": "（该年份发生的关键事件描述）" }}
  ]
}}
"""
    
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"这是关于“{topic}”的维基百科全文，请为我提取信息：\n\n{wiki_content}"}
    ]

    try:
        response = client.chat.completions.create(
            model="deepseek-chat",
            messages=messages,
            max_tokens=1500,
            temperature=0.2,
            response_format={"type": "json_object"}
        )
        
        content = response.choices[0].message.content
        data = json.loads(content)
        print(f"LLM Service: 成功为“{topic}”生成了内容。") # <-- 增加成功日志
        return data

    # --- 这里是本次修改的核心 ---
    except APITimeoutError:
        print(f"LLM为“{topic}”生成摘要和时间线时超时。请检查网络连接。")
        return {"summary": "AI生成摘要超时，请检查网络或稍后再试。", "timeline": []}
    except Exception as e:
        # 打印更详细的错误，方便我们看到是不是又有认证问题或其他错误
        print(f"LLM生成摘要和时间线时发生未知错误: {e}") 
        return {"summary": "AI在生成摘要时遇到了一个未知问题，请查看后端日志。", "timeline": []}