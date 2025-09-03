# backend/app/services/llm_service.py

import os
import json
from openai import OpenAI, APITimeoutError # 导入APITimeoutError
from app.schemas.main_schemas import AIChatRequest
from typing import List, Dict # 确保导入 List 和 Dict

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

def analyze_viewpoints_and_debates(topic: str, main_content: str, talk_content: str) -> dict:
    """
    分析历史事件的对立观点和维基讨论页内容
    """
    print(f"LLM Service: 分析'{topic}'的对立观点和讨论内容...")
    
    # 限制内容长度
    max_length = 10000
    if len(main_content) > max_length:
        main_content = main_content[:max_length] + "\n\n[主页面内容已截断]"
    
    if len(talk_content) > max_length:
        talk_content = talk_content[:max_length] + "\n\n[讨论页内容已截断]"
    
    system_prompt = f"""
你是一名专业的历史学家助手。你的任务是分析关于'{topic}'的历史事件，从维基百科主页面和讨论页内容中提取对立观点和争议要点。

你的输出必须严格遵循以下JSON格式，不要添加任何额外的解释或文字：
{{
  "viewpoints": [
    {{ "side": "A（观点一）", "text": "观点一的详细描述" }},
    {{ "side": "B（观点二）", "text": "观点二的详细描述" }}
  ],
  "debates": [
    "讨论页中的争议要点1",
    "讨论页中的争议要点2",
    "讨论页中的争议要点3"
  ]
}}

要求：
1. viewpoints应该包含2-3个主要的对立观点，每个观点要有明确的立场标识
2. debates应该提取讨论页中的关键争议点，每个要点要简洁明了
3. 如果讨论页内容较少，可以基于主页面内容推断可能的争议点
4. 所有内容都要客观中立，避免价值判断
"""
    
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"""
请分析以下关于'{topic}'的维基百科内容：

【主页面内容】
{main_content}

【讨论页内容】
{talk_content}

请提取对立观点和争议要点。
"""}
    ]

    try:
        response = client.chat.completions.create(
            model="deepseek-chat",
            messages=messages,
            max_tokens=2000,
            temperature=0.3,
            response_format={"type": "json_object"}
        )
        
        content = response.choices[0].message.content
        data = json.loads(content)
        print(f"LLM Service: 成功为'{topic}'分析了观点和争议。")
        return data

    except APITimeoutError:
        print(f"LLM分析'{topic}'观点和争议时超时。")
        return {
            "viewpoints": [
                {"side": "A（观点一）", "text": "AI分析超时，请检查网络连接。"},
                {"side": "B（观点二）", "text": "AI分析超时，请检查网络连接。"}
            ],
            "debates": ["AI分析超时，请检查网络连接。"]
        }
    except Exception as e:
        print(f"LLM分析观点和争议时发生未知错误: {e}")
        return {
            "viewpoints": [
                {"side": "A（观点一）", "text": "AI分析遇到问题，请查看后端日志。"},
                {"side": "B（观点二）", "text": "AI分析遇到问题，请查看后端日志。"}
            ],
            "debates": ["AI分析遇到问题，请查看后端日志。"]
        }
    
def generate_source_comparison(topic: str, source_contents: List[dict]) -> dict:
    """
    新增：根据抓取到的参考文献内容，让LLM进行对比和摘录。
    """
    print(f"LLM Service: Generating source comparison for {topic}...")

    # 构造prompt，确保LLM不编造数据
    system_prompt = f"""
你是一名专业的历史学家助手。你的任务是分析提供的关于“{topic}”的参考文献内容，并从中挑选出两份最有代表性、能够体现不同视角的史料。

请严格遵守以下规则：
1.  从提供的参考文献列表中，选择两份内容最能体现不同立场或观点的史料。
2.  对于选定的每一份史料，请提取一个简短、核心的片段（不要超过200字），并注明其出处（title和url）以及它所代表的视角。
3.  你的输出必须是JSON格式，结构如下，不要添加任何额外文字。
4.  严禁编造任何信息！所有引用的片段、标题、URL都必须直接来自提供的参考文献内容。如果找不到合适的材料，请返回一个空列表。

{{
  "sources": [
    {{ "title": "史料标题1", "url": "史料URL1", "snippet": "摘录的片段1", "viewpoint": "所代表的视角1" }},
    {{ "title": "史料标题2", "url": "史料URL2", "snippet": "摘录的片段2", "viewpoint": "所代表的视角2" }}
  ]
}}
"""
    
    # 将所有参考文献内容整合成一个字符串，供LLM分析
    context_text = ""
    if source_contents:
        for i, item in enumerate(source_contents):
            # 仅处理抓取成功的内容
            if item.get("success") and item.get("content"):
                content = item["content"]
                # 限制每个源的长度，避免超出LLM的token限制
                max_source_length = 5000 
                if len(content) > max_source_length:
                    content = content[:max_source_length] + "..."
                
                context_text += f"\n\n--- 史料{i+1}：{item.get('title', '未知标题')} ---\n"
                context_text += f"URL: {item.get('url', '无')}\n"
                context_text += f"内容：{content}"

    if not context_text:
        return {"sources": []} # 如果没有可用的史料，返回空列表

    try:
        response = client.chat.completions.create(
            model="deepseek-chat",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": context_text}
            ],
            max_tokens=2000,
            temperature=0.3,
            response_format={"type": "json_object"}
        )

        content = response.choices[0].message.content
        data = json.loads(content)
        print(f"LLM Service: 成功为'{topic}'生成了史料对比内容。")
        return data

    except APITimeoutError:
        print(f"LLM为'{topic}'生成史料对比时超时。")
        return {"sources": [{"title": "错误", "url": "", "snippet": "AI生成史料对比超时，请检查网络或稍后再试。", "viewpoint": ""}]}
    except Exception as e:
        print(f"LLM生成史料对比时发生未知错误: {e}")
        return {"sources": [{"title": "错误", "url": "", "snippet": "AI生成史料对比时遇到问题，请查看后端日志。", "viewpoint": ""}]}