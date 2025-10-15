# backend/app/services/llm_service.py

import os
import json
from openai import OpenAI, APITimeoutError # 导入APITimeoutError
from app.schemas.main_schemas import AIChatRequest
from typing import List, Dict,AsyncGenerator, Tuple # 确保导入 List 和 Dict
import functools

# 修改客户端初始化，增加超时设置（例如90秒）
client = OpenAI(
    api_key=os.environ.get("DEEPSEEK_API_KEY"),
    base_url="https://api.deepseek.com",
    timeout=90.0,  # <-- 增加90秒超时
)

async def get_socratic_response_stream(request: AIChatRequest) -> AsyncGenerator[str, None]:
    # 基础人设
    system_prompt = f"""
你是一名专业的历史学领域的苏格ρά底式导师。你的唯一目标是引导学生进行批判性思考，绝不直接提供答案或进行总结。

核心规则:
1.  始终以启发性问题回应，而不是陈述事实或给出答案。
2.  你的问题必须紧密围绕学生当前的探究阶段和所提供的学习材料。
3.  保持对话简短、有启发性、开放性, 避免是非题。
4.  永远不要说"我不知道"或"我无法回答"。你的职责是基于现有信息提出引导性问题。
5.  **重要：所有回复必须使用简体中文，不能使用繁体字。**

当前的历史探究主题是: {request.topic}
"""

    # --- 根据不同模块，动态添加具体任务指令 ---

    if request.current_module == "模块一：史实认知":
        system_prompt += """
        你正处于【模块一：史实认知】。
        你的任务是：引导用户深入阅读维基百科的完整条目，帮助他们梳理基本史实，建立初步的因果和时序概念。
        - 针对提供的**维基百科全文**，可以提出一些开放性问题来引导用户关注文章的核心内容，例如："通读全文后，你认为这篇文章主要想阐述哪几个核心观点？" 或 "文章的结构是如何安排的？你认为作者为什么这样安排？"
        - 引导用户关注“延续与变迁”和“因果与结果”，例如："除了众所周知直接原因，文章还提到了哪些深层次的社会或经济背景？"
        """
    elif request.current_module == "模块二：观点辨析":
        system_prompt += """
        你正处于【模块二：观点辨析】。
        你的任务是：引导用户从多角度分析历史事件，识别不同立场和争议，认识历史叙述的主观性。
        - 针对提供的对立观点(A/B方)，可以问："这两方观点的核心分歧在哪里？" 或 "你认为A方的观点可能受到了什么立场或背景的影响？"
        - 引导用户思考“历史之视角”，例如："为什么不同的作者会对同一事件有截然不同的描述？这告诉我们关于历史叙述的什么特性？"
        """
    elif request.current_module == "模块三：史料分析":
        system_prompt += """
        你正处于【模块三：史料分析】。
        你的任务是：引导用户对史料进行“来源探究”、深入“佐证”和“情境化”分析，通过对比阅读来质询史料。
        - 针对提供的多份史料片段，可以问："对比史料1和史料2，它们在描述同一件事时有何不同之处？" 或 "这两份史料的作者身份（例如官员 vs 商人）会如何影响他们的记述？"
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
    
    if not client.api_key:
        print("警告: DEEPSEEK_API_KEY 环境变量未设置。")
        yield "看起来环境变量没有设置正确，你能检查一下吗？"
        return
    try:
         # **核心修改：添加 stream=True**
        stream = client.chat.completions.create(
            model="deepseek-chat",
            messages=messages,
            max_tokens=1000,
            temperature=0.7,
            stream=True,
        )
        # **核心修改：逐块 yield 内容**
        for chunk in stream:
            content = chunk.choices[0].delta.content
            if content:
                yield content
    except APITimeoutError:
        print("调用 DeepSeek API 超时。")
        ai_response = "AI思考超时了，请检查网络或稍后再试。"
    except Exception as e:
        print(f"调用 DeepSeek API 时出错: {e}")
        yield "在引导你思考时我遇到了一些困难，我们可以换个角度提问吗？"

# ▼▼▼ 这是唯一被修改的函数，以满足新的时间线要求 ▼▼▼
# @functools.lru_cache(maxsize=128)
def generate_summary_and_timeline(topic: str, wiki_content: str) -> dict:
    print(f"LLM Service: Generating detailed summary and timeline for {topic}...")
    
    max_length = 15000 
    if len(wiki_content) > max_length:
        wiki_content = wiki_content[:max_length] + "\n\n[内容已截断]"
        
    system_prompt = f"""
你是一名专业的历史学家助手。你的任务是阅读提供的关于"{topic}"的维基百科文章全文，并从中提取关键信息。

你的输出必须严格遵循以下JSON格式，不要添加任何额外的解释或文字。
**重要：所有输出内容必须使用简体中文，不能使用繁体字。**

规则：
1.  **摘要 (summary)**: 生成一段约200字的简体中文摘要。
2.  **时间线 (timeline)**:
    a.  提取 **5个** 最关键的核心历史事件。
    b.  时间请精确到 **年份和月份** (例如 "1936年12月")，不要精确到日。
    c.  确保这5个事件的时间点具有多样性，避免集中在同一个时间段。
    d.  **【最重要规则】`source_text` 字段**：
        -   内容**必须是**从维基百科原文中**逐字逐句、一字不差地复制**的、最能证明该事件的**连续文本片段**。
        -   **绝对禁止**对原文进行任何形式的修改、总结、推断或添加任何原文不存在的文字（例如自己组合年和月日）。
        -   必须保证复制的文本在原文中是**连续存在**的。

JSON格式:
{{
  "summary": "（这里是你生成的关于该历史事件的200字左右的摘要，必须使用简体中文）",
  "timeline": [
    {{
      "year": "（年份和月份，例如：1936年12月）",
      "event": "（该时间发生的关键事件描述，必须使用简体中文）",
      "source_text": "（从提供的维基百科全文中，逐字复制的、用于支撑该事件的、绝对未经修改的原始连续文本。）"
    }},
    {{
      "year": "（年份和月份，例如：1937年1月）",
      "event": "（第二个关键事件的描述）",
      "source_text": "（从原文中复制的、与第二个事件相关的、绝对未经修改的原始连续文本。）"
    }}
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
            max_tokens=2500, # 增加 token 数量以容纳 source_text
            temperature=0.2,
            response_format={"type": "json_object"}
        )
        
        content = response.choices[0].message.content
        data = json.loads(content)
        
        # ▼▼▼ 在这里加上这行打印语句 ▼▼▼
        print("--- LLM Raw Output ---")
        print(json.dumps(data, indent=2, ensure_ascii=False))
        print("--- End of LLM Raw Output ---")
        
        print(f"LLM Service: 成功为“{topic}”生成了内容。")
        return data

    except APITimeoutError:
        print(f"LLM为“{topic}”生成摘要和时间线时超时。请检查网络连接。")
        return {"summary": "AI生成摘要超时，请检查网络或稍后再试。", "timeline": []}
    except Exception as e:
        print(f"LLM生成摘要和时间线时发生未知错误: {e}") 
        return {"summary": "AI在生成摘要时遇到了一个未知问题，请查看后端日志。", "timeline": []}
# ▲▲▲ 修改结束 ▲▲▲

# --- 以下所有函数均保持您提供的原样，一行未删 ---
@functools.lru_cache(maxsize=128)
def analyze_faction_roles(topic: str, wiki_content: str) -> dict:
    """
    分析历史事件中不同阵营的正面及负面作用。
    """
    print(f"LLM Service: 正在为 {topic} 分析各阵营作用...")

    max_length = 15000
    if len(wiki_content) > max_length:
        wiki_content = wiki_content[:max_length] + "\n\n[内容已截断]"

    system_prompt = f"""
你是一名专业的历史研究员。你的任务是基于提供的关于"{topic}"的维基百科文章，分析其中各个关键阵营所扮演的角色。

请严格遵循以下要求：
1.  首先，识别出事件中的主要参与阵营（例如，国民党、共产党、东北军、西北军等）。
2.  对每一个识别出的阵营，分别从"正面作用"和"负面作用"两个角度进行分析和总结。
3.  你的分析必须完全基于提供的文章内容，不得引入外部知识或进行主观臆断。
4.  输出必须是严格的JSON格式，结构如下，不要添加任何额外的解释或文字。
5.  **重要：所有输出内容必须使用简体中文，不能使用繁体字。**

{{
  "faction_roles": [
    {{
      "faction_name": "（阵营一的名称，必须使用简体中文）",
      "roles": [
        {{ "type": "正面作用", "description": "（对该阵营正面作用的客观总结，必须使用简体中文）" }},
        {{ "type": "负面作用", "description": "（对该阵营负面作用的客观总结，必须使用简体中文）" }}
      ]
    }},
    {{
      "faction_name": "（阵营二的名称，必须使用简体中文）",
      "roles": [
        {{ "type": "正面作用", "description": "（对该阵营正面作用的客观总结，必须使用简体中文）" }},
        {{ "type": "负面作用", "description": "（对该阵营负面作用的客观总结，必须使用简体中文）" }}
      ]
    }}
  ]
}}
"""

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"请根据以下关于“{topic}”的维基百科全文，为我分析各方阵营的作用：\n\n{wiki_content}"}
    ]

    try:
        response = client.chat.completions.create(
            model="deepseek-chat",
            messages=messages,
            max_tokens=2500,
            temperature=0.2,
            response_format={"type": "json_object"}
        )

        content = response.choices[0].message.content
        data = json.loads(content)
        print(f"LLM Service: 成功为“{topic}”分析了阵营作用。")
        return data

    except APITimeoutError:
        print(f"LLM为“{topic}”分析阵营作用时超时。")
        return {
            "faction_roles": [
                {
                    "faction_name": "AI分析超时",
                    "roles": [{"type": "错误", "description": "生成内容超时，请检查网络或稍后再试。"}]
                }
            ]
        }
    except Exception as e:
        print(f"LLM分析阵营作用时发生未知错误: {e}")
        return {
            "faction_roles": [
                {
                    "faction_name": "AI分析错误",
                    "roles": [{"type": "错误", "description": "生成内容时遇到问题，请查看后端日志。"}]
                }
            ]
        }

@functools.lru_cache(maxsize=128)
@functools.lru_cache(maxsize=128)
def analyze_viewpoints_and_debates(topic: str, main_content: str, talk_content: str, exclude_debates: List[str] = None) -> dict:
    """
    分析历史事件的对立观点和维基讨论页内容。
    【新功能】: 可以接收一个需要排除的争议点列表，以生成新的内容。
    """
    print(f"LLM Service: 分析'{topic}'的对立观点和讨论内容...")
    if exclude_debates:
        print(f"  > Exluding {len(exclude_debates)} known debate points.")
    
    # 限制内容长度
    max_length = 10000
    if len(main_content) > max_length:
        main_content = main_content[:max_length] + "\n\n[主页面内容已截断]"
    
    if len(talk_content) > max_length:
        talk_content = talk_content[:max_length] + "\n\n[讨论页内容已截断]"
    
    system_prompt = f"""
你是一名专业的历史学家助手。你的任务是分析关于'{topic}'的历史事件，从维基百科主页面和讨论页内容中提取对立观点和争议要点。

你的输出必须严格遵循以下JSON格式，不要添加任何额外的解释或文字：
**重要：所有输出内容必须使用简体中文，不能使用繁体字。**

{{
  "viewpoints": [
    {{ "side": "A（观点一）", "text": "观点一的详细描述（必须使用简体中文）" }},
    {{ "side": "B（观点二）", "text": "观点二的详细描述（必须使用简体中文）" }}
  ],
  "debates": [
    "讨论页中的争议要点1（必须使用简体中文）",
    "讨论页中的争议要点2（必须使用简体中文）",
    "讨论页中的争议要点3（必须使用简体中文）"
  ]
}}

要求：
1. viewpoints应该包含2-3个主要的对立观点，每个观点要有明确的立场标识
2. debates应该提取讨论页中的关键争议点，每个要点要简洁明了
3. 如果讨论页内容较少，可以基于主页面内容推断可能的争议点
4. 所有内容都要客观中立，避免价值判断
5. **所有输出内容必须使用简体中文，不能使用繁体字**
"""
    
    # --- ▼▼▼ 这是核心修改区域 ▼▼▼ ---
    # 如果传入了需要排除的列表，就动态地向 system_prompt 追加新指令
    if exclude_debates:
        # 将列表格式化为易于阅读的、带编号的字符串
        excluded_list_str = "\n".join([f"{i+1}. {item}" for i, item in enumerate(exclude_debates)])
        
        # 向 system_prompt 追加新的核心指令
        system_prompt += f"""

**【追加核心任务】**
请提取一组**与下方列表中的要点完全不同**的、新的争议要点。
如果找不到任何新的要点，可以返回一个空数组。

【需要排除的已有要点列表】:
{excluded_list_str}
"""
    # --- ▲▲▲ 修改结束 ▲▲▲ ---
    
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
            temperature=0.3, # 保持较低的温度以确保一致性
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

@functools.lru_cache(maxsize=128)
def analyze_detailed_discussion(topic: str, debate_item: str, main_content: str, talk_content: str, faction_names: List[str]) -> dict:
    """
    分析特定讨论要点的详细内容和多方观点
    严格基于维基百科讨论页内容进行分析
    """
    
    print(f"LLM Service: 分析'{topic}'中'{debate_item}'的详细讨论内容，并关联阵营: {faction_names}...")
    
    # 限制讨论页内容长度，但确保有足够内容进行分析
    max_length = 15000
    if len(talk_content) > max_length:
        talk_content = talk_content[:max_length] + "\n\n[讨论页内容已截断]"
    
    # 如果讨论页内容太少，直接返回空结果
    if len(talk_content.strip()) < 100:
        return {
            "detailed_viewpoints": [],
            "discussion_content": "讨论页内容不足，无法进行详细分析。",
            "source_sections": []
        }
    
    system_prompt = f"""
你是一名专业的历史学家助手。你的任务是严格基于维基百科讨论页内容，分析关于'{topic}'的特定讨论要点"{debate_item}"的多方观点。

重要要求：
1. 必须严格基于提供的维基百科讨论页内容进行分析
2. 不能基于主页面内容进行推断或补充
3. 如果讨论页中没有与"{debate_item}"直接相关的内容，请返回空结果
4. 所有观点和证据都必须直接来源于讨论页内容
5. **重要：所有输出内容必须使用简体中文，不能使用繁体字**
6. **【新增核心任务】** 识别并返回你用于分析的所有相关讨论章节的**确切标题**
7. **【新增核心任务】** 必须从下面提供的阵营列表中，识别出哪些阵营与当前讨论的要点 "{debate_item}" **直接相关**

【已知阵营列表】: {faction_names}

你的输出必须严格遵循以下JSON格式，不要添加任何额外的解释或文字：
{{
  "detailed_viewpoints": [
    {{ "side": "观点A", "text": "详细观点描述（必须使用简体中文）", "evidence": "支撑证据（必须使用简体中文）" }},
    {{ "side": "观点B", "text": "详细观点描述（必须使用简体中文）", "evidence": "支撑证据（必须使用简体中文）" }}
  ],
  "discussion_content": "与该项讨论要点相关的具体讨论内容摘要（必须使用简体中文）",
  "source_sections": [
    "（你找到的第一个相关章节的标题，逐字复制）",
    "（你找到的第二个相关章节的标题，逐字复制）"
  ],
  "involved_factions": [
    "（从【已知阵营列表】中选出的、与本次讨论相关的阵营名称1）",
    "（从【已知阵营列表】中选出的、与本次讨论相关的阵营名称2）"
  ]
}}

要求：
1.  **输入格式**: 提供的讨论页内容使用了 `== 章节标题 ==` 的格式来明确标记每个章节。这是你识别标题的唯一依据。

2.  **`source_sections` 字段规则**:
    * 此数组必须，也只能包含你参考过的章节的**章节标题**。
    * 你必须从输入文本中逐字复制 `==` 和 `==` 之间的文字（例如 "讨论1", "讨论2"）。
    * **绝对禁止**从正文内容中自行发明、截取或总结任何标题。

3.  **`detailed_viewpoints` 字段规则**:
    * 应该包含2-4个不同的观点，每个观点要有明确的立场标识、详细描述和支撑证据。

4.  **`discussion_content` 字段规则**:
    * 应该提取与该项讨论要点 ("{debate_item}") 最相关的具体讨论内容摘要。

5.  **通用内容规则**:
    * 所有观点、证据和摘要都必须直接来源于提供的讨论页内容，不能编造或推断。
    * 所有内容都要客观中立，避免价值判断。
    * 如果讨论页中没有与 "{debate_item}" 直接相关的内容，请返回空的 `detailed_viewpoints` 和 `source_sections` 数组，以及相应的提示信息。
    * **所有输出内容必须使用简体中文，不能使用繁体字。**

6.  **`involved_factions` 字段规则**:
    * 此数组的内容**必须**是【已知阵营列表】的子集。
    * 如果没有任何已知阵营与讨论相关，请返回一个空数组 `[]`。
    * **绝对禁止**编造任何不在列表中的阵营名称。
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
            "discussion_content": "AI分析超时，请检查网络连接。",
            "source_sections": []
        }
    except Exception as e:
        print(f"LLM分析详细讨论时发生未知错误: {e}")
        return {
            "detailed_viewpoints": [
                {"side": "观点A", "text": "AI分析遇到问题，请查看后端日志。", "evidence": ""},
                {"side": "观点B", "text": "AI分析遇到问题，请查看后端日志。", "evidence": ""}
            ],
            "discussion_content": "AI分析遇到问题，请查看后端日志。",
            "source_sections": []
        }
    
def generate_source_comparison(topic: str, source_contents: List[Dict[str, str]]) -> dict:
    """
    这是一个外部包装函数，用于处理不可哈希的 list 参数。
    应用的其他部分应该调用这个函数。
    """
    # 核心步骤：将字典列表转换为一个稳定且可哈希的格式（元组的元组）。
    # 我们对每个字典的键值对进行排序，以确保 {'a': 1, 'b': 2} 和 {'b': 2, 'a': 1}
    # 被视为同一个缓存键。
    hashable_contents = tuple(
        tuple(sorted(d.items())) for d in source_contents
    )
    
    # 使用转换后的可哈希参数来调用真正的缓存函数。
    return _cached_generate_source_comparison(topic, hashable_contents)

# ▼▼▼ 这是被大幅修改的核心函数 ▼▼▼
@functools.lru_cache(maxsize=128)
def _cached_generate_source_comparison(topic: str, source_contents_tuple: Tuple[Tuple[str, str], ...]) -> dict:
    """
    这是内部的、被缓存的工作函数。它只接受可哈希的参数。
    它负责执行真正耗时的大语言模型调用。
    【新功能】: 此函数现在能根据输入史料的数量，动态切换提示词。
    """
    # 在函数内部，我们将元组转换回列表，以便在提示词中使用。
    source_contents = [dict(item) for item in source_contents_tuple]
    print(f"LLM Service: Generating source comparison for {topic} with {len(source_contents)} sources.")

    system_prompt = ""
    json_format_snippet = """
{{
  "sources": [
    {{ "title": "史料标题1", "url": "史料URL1", "snippet": "【这里是翻译成简体中文后的片段1】", "viewpoint": "【这里是用简体中文描述的视角1】" }},
    {{ "title": "史料标题2", "url": "史料URL2", "snippet": "【这里是翻译成简体中文后的片段2】", "viewpoint": "【这里是用简体中文描述的视角2】 }}
  ]
}}
"""
    base_rules = """
请严格遵守以下规则：
1.  你的输出必须是严格的JSON格式，结构如下，不要添加任何额外文字。
2.  对于每一份史料，请提取一个简短、核心的片段（不要超过200字），并注明其出处（title和url）以及它所代表的视角。
3.  严禁编造任何信息！所有引用的片段、标题、URL都必须直接来自提供的参考文献内容。
4.  所有输出的JSON值，包括 "snippet" 和 "viewpoint"，都必须是简体中文。
5.  如果片段是任何非中文语言，你必须先将其完整、准确地翻译成简体中文，然后再填入 "snippet" 字段。
6.  **重要：所有输出内容必须使用简体中文，不能使用繁体字。**
"""

    # --- 核心修改：根据文献数量选择不同的Prompt ---
    if len(source_contents) <= 2:
        # **场景：更换一组** (只提供了2篇)
        # 任务是直接分析这2篇，而不是选择
        print("LLM Service: Using DIRECT ANALYSIS prompt (2 sources).")
        system_prompt = f"""
你是一名专业的历史学家助手。你的任务是 **直接分析** 提供的关于"{topic}"的 **全部（{len(source_contents)}份）** 参考文献内容。

{base_rules}
- **核心任务**：不要进行选择。请为 **每一份** 提供的史料生成对应的片段和视角分析。

{json_format_snippet}
"""
    else:
        # **场景：更新列表** (提供了多篇)
        # 任务是从中选择2篇
        print(f"LLM Service: Using SELECTION prompt ({len(source_contents)} sources).")
        system_prompt = f"""
你是一名专业的历史学家助手。你的任务是从提供的关于"{topic}"的参考文献内容中，**挑选出两份**最有代表性、能够体现不同视角的史料。

{base_rules}
- **核心任务**：从下面的参考文献列表中，选择两份内容最能体现不同立场或观点的史料进行分析。如果找不到合适的材料，可以返回一个空的 "sources" 列表。

{json_format_snippet}
"""
    
    # 将所有参考文献内容整合成一个字符串，供LLM分析
    context_text = ""
    if source_contents:
        for i, item in enumerate(source_contents):
            # 仅处理抓取成功的内容
            # 注意：在“更换一组”场景下，前端已经净化过数据，没有success字段，所以要兼容
            content = item.get("content")
            if content:
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
            temperature=0.2,
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
# ▲▲▲ 修改结束 ▲▲▲

@functools.lru_cache(maxsize=128)
def summarize_reference_content(content: str) -> str:
    """
    使用LLM为一个参考文献内容生成简短的摘要。
    """
    # 限制输入内容的长度
    max_length = 4000
    if len(content) > max_length:
        content = content[:max_length] + "..."

    prompt = f"""
请为以下文献内容生成一段不超过80字的、客观的摘要，总结其核心观点和背景信息。
如果内容是外文,请将摘要翻译成中文再输出。
直接输出摘要文本，不要包含任何额外的前缀或标题。
**重要：一定要输出简体中文，不能使用繁体字！！！**

文献内容：
"{content}"
"""
    try:
        response = client.chat.completions.create(
            model="deepseek-chat",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=500,
            temperature=0.2,
        )
        summary = response.choices[0].message.content.strip()
        return summary
    except Exception as e:
        print(f"为参考文献生成摘要时出错: {e}")
        # 如果AI摘要失败，返回原文的前100个字符作为备用
        return content[:100] + "..."