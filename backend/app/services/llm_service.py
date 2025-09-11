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
    timeout=60.0,  # <-- 增加30秒超时
)

def get_socratic_response(request: AIChatRequest) -> str:
    # 基础人设
    system_prompt = f"""
你是一名专业的历史学领域的苏格拉底式导师。你的唯一目标是引导学生进行批判性思考，绝不直接提供答案或进行总结。

核心规则:
1.  始终以启发性问题回应，而不是陈述事实或给出答案。
2.  你的问题必须紧密围绕学生当前的探究阶段和所提供的学习材料。
3.  保持对话简短、有启发性、开放性, 避免是非题。
4.  永远不要说“我不知道”或“我无法回答”。你的职责是基于现有信息提出引导性问题。

当前的历史探究主题是: {request.topic}
"""

    # --- 根据不同模块，动态添加具体任务指令 ---

    if request.current_module == "模块一：史实认知":
        system_prompt += """
        你正处于【模块一：史实认知】。
        你的任务是：引导用户深入阅读维基百科的完整条目，帮助他们梳理基本史实，建立初步的因果和时序概念。
        - 针对提供的**维基百科全文**，可以提出一些开放性问题来引导用户关注文章的核心内容，例如："通读全文后，你认为这篇文章主要想阐述哪几个核心观点？" 或 "文章的结构是如何安排的？你认为作者为什么这样安排？"
        - 引导用户关注“延续与变迁”和“因果与结果”，例如："除了众所周知的直接原因，文章还提到了哪些深层次的社会或经济背景？"
        """
    elif request.current_module == "模块二：观点辨析":
        system_prompt += """
        你正处于【模块二：观点辨析】。
        你的任务是：引导用户对史料进行“来源探究”和“情境化”分析。
        - 针对提供的对立观点(A/B方)，可以问："这两方观点的核心分歧在哪里？" 或 "你认为A方的观点可能受到了什么立场或背景的影响？"
        - 引导用户思考“历史之视角”，例如："为什么不同的作者会对同一事件有截然不同的描述？这告诉我们关于历史叙述的什么特性？"
        """
    elif request.current_module == "模块三：史料分析":
        system_prompt += """
        你正处于【模块三：史料分析】。
        你的任务是：引导用户深入“佐证”和“情境化”分析，通过对比阅读来质询史料。
        - 针对提供的多份史料片段，可以问："对比史料1和史料2，它们在描述同一件事时有何不同之处？" 或 "这两份史料的作者身份（例如官员 vs 商人）会如何影响他们的记述？"
        """
    elif request.current_module == "模块四：反思总结":
        system_prompt += """
        你正处于【模块四：反思总结】。
        你的任务是：引导用户进行更高层次的思考，涉及“历史之重要性”和“伦理维度”。
        - 可以提出与“历史重要性”相关的问题，如："了解这段历史，对于我们理解当今的某个问题有什么帮助吗？"
        - 可以引导“伦理反思”，如："作为历史学习者，我们应如何平衡‘民族记忆’与‘学术客观性’？"
        """
    # 新增：处理用户选中文本的场景
    elif request.current_module == "针对选中内容提问":
        system_prompt += """
        你正处于【针对选中内容提问】的特殊模式。
        你的任务是：针对用户刚刚选中的一小段文本进行提问，引导他们深入思考这段具体信息的含义、来源或言外之意。
        - 例如，可以问："你为什么会对这段内容特别感兴趣？" 或 "这段描述中，有没有哪些词语或说法你觉得值得进一步探究？" 或 "这段信息与其他材料是否存在矛盾或可以相互印证的地方？"
        - 你的提问必须非常聚焦于下面提供的“学习材料”。
        """

    if request.context_text:
        system_prompt += f"\n--- 以下是学生正在阅读的学习材料，你的提问需要基于这些内容 ---\n{request.context_text}\n---"

    history_dicts = [msg.dict() for msg in request.history]
    messages = [{"role": "system", "content": system_prompt}] + history_dicts
    
    # ... 后续的 API 调用逻辑保持不变 ...
    if not client.api_key:
        print("警告: DEEPSEEK_API_KEY 环境变量未设置。返回一个模拟回复。")
        return "看起来环境变量没有设置正确，你能检查一下吗？"
    try:
        response = client.chat.completions.create(
            model="deepseek-chat",
            messages=messages,
            max_tokens=200,
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
    
def analyze_detailed_discussion(topic: str, debate_item: str, main_content: str, talk_content: str) -> dict:
    """
    分析特定讨论要点的详细内容和多方观点
    严格基于维基百科讨论页内容进行分析
    """
    print(f"LLM Service: 分析'{topic}'中'{debate_item}'的详细讨论内容...")
    
    # 限制讨论页内容长度，但确保有足够内容进行分析
    max_length = 15000
    if len(talk_content) > max_length:
        talk_content = talk_content[:max_length] + "\n\n[讨论页内容已截断]"
    
    # 如果讨论页内容太少，直接返回空结果
    if len(talk_content.strip()) < 100:
        return {
            "detailed_viewpoints": [],
            "discussion_content": "讨论页内容不足，无法进行详细分析。"
        }
    
    system_prompt = f"""
你是一名专业的历史学家助手。你的任务是严格基于维基百科讨论页内容，分析关于'{topic}'的特定讨论要点"{debate_item}"的多方观点。

重要要求：
1. 必须严格基于提供的维基百科讨论页内容进行分析
2. 不能基于主页面内容进行推断或补充
3. 如果讨论页中没有与"{debate_item}"直接相关的内容，请返回空结果
4. 所有观点和证据都必须直接来源于讨论页内容

你的输出必须严格遵循以下JSON格式，不要添加任何额外的解释或文字：
{{
  "detailed_viewpoints": [
    {{ "side": "观点A", "text": "详细观点描述", "evidence": "支撑证据" }},
    {{ "side": "观点B", "text": "详细观点描述", "evidence": "支撑证据" }}
  ],
  "discussion_content": "与该项讨论要点相关的具体讨论内容摘要"
}}

要求：
1. detailed_viewpoints应该包含2-4个不同的观点，每个观点要有明确的立场标识、详细描述和支撑证据
2. 所有观点和证据都必须直接来源于讨论页内容，不能编造或推断
3. discussion_content应该提取与该项讨论要点最相关的讨论内容
4. 如果讨论页中没有相关内容，请返回空数组
5. 所有内容都要客观中立，避免价值判断
6. 重点关注与"{debate_item}"直接相关的内容
"""
    
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"""
请严格基于以下维基百科讨论页内容，分析关于'{topic}'的特定讨论要点"{debate_item}"：

【讨论页内容】
{talk_content}

请提取与"{debate_item}"相关的多方观点和详细讨论内容。如果讨论页中没有相关内容，请返回空结果。
"""}
    ]

    try:
        response = client.chat.completions.create(
            model="deepseek-chat",
            messages=messages,
            max_tokens=2500,
            temperature=0.3,
            response_format={"type": "json_object"}
        )
        
        content = response.choices[0].message.content
        data = json.loads(content)
        print(f"LLM Service: 成功为'{topic}'的'{debate_item}'分析了详细讨论内容。")
        return data

    except APITimeoutError:
        print(f"LLM分析'{topic}'的'{debate_item}'详细讨论时超时。")
        return {
            "detailed_viewpoints": [
                {"side": "观点A", "text": "AI分析超时，请检查网络连接。", "evidence": ""},
                {"side": "观点B", "text": "AI分析超时，请检查网络连接。", "evidence": ""}
            ],
            "discussion_content": "AI分析超时，请检查网络连接。"
        }
    except Exception as e:
        print(f"LLM分析详细讨论时发生未知错误: {e}")
        return {
            "detailed_viewpoints": [
                {"side": "观点A", "text": "AI分析遇到问题，请查看后端日志。", "evidence": ""},
                {"side": "观点B", "text": "AI分析遇到问题，请查看后端日志。", "evidence": ""}
            ],
            "discussion_content": "AI分析遇到问题，请查看后端日志。"
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
    
# --- 新增函数 ---
def generate_outline(topic: str, content: str) -> dict:
    """
    使用LLM从维基百科内容中提取结构化大纲
    """
    system_prompt = f"""
你是一个专业的历史研究助理。
你的任务是根据提供的维基百科页面内容，为历史研究主题“{topic}”生成一个结构化的学习大纲。
输出格式必须严格遵循以下JSON模式，不包含任何额外文本或Markdown格式：
{{
  "topic": "主题（研究问题/课题）",
  "timeline": "时间线（关键事件：时间、地点、人物、简述）",
  "causality": "因果链（直接原因/深层原因/触发事件 → 过程 → 结果/影响）",
  "figures": "人物/势力（立场、目标、行动、相互关系）",
  "viewpoints": "观点与史学争鸣（不同史家/学派观点 + 论据）",
  "evidence": "证据节点（摘录/数据/图表，指向原始史料或二手文献）",
  "conclusion": "结论/反思（你的判断、局限性、未解问题）"
}}

要求：
1. 根据提供的内容，对每一个字段进行简要但全面的总结。
2. 如果内容中缺少某个字段的信息，请留空。
3. 所有字段的内容都应基于维基百科文章，保持客观中立。
"""
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"请分析以下关于'{topic}'的维基百科页面内容，并生成一个结构化的大纲：\n\n{content}"}
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
        print(f"LLM Service: 成功为'{topic}'生成了结构化大纲。")
        return data
    except Exception as e:
        print(f"LLM Service: 调用失败，错误信息: {e}")
        # 如果出错，返回一个空模板
        return {
            "topic": topic,
            "timeline": "",
            "causality": "",
            "figures": "",
            "viewpoints": "",
            "evidence": "",
            "conclusion": ""
        }