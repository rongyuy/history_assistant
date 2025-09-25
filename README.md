<<<<<<< HEAD
# AI引导的历史探究学习平台
这是一个AI引导的历史探究学习平台，旨在帮助用户在历史学习中培养批判性思维。平台通过结构化的探究流程和AI引导的苏格拉底式对话，引导用户深入分析历史事件，辨析多元观点，并形成自己的结论。

## 特色功能
+ **引导式探究流程**: 平台提供四大核心功能模块，构建系统化的探究路径，包括史实认知、观点辨析、史料分析和反思总结。
+ **AI认知向导**: 采用苏格拉底式对话的AI引导模型，通过提问而非直接回答的方式，激发用户的批判性思考。
+ **多功能笔记系统**: 提供与探究核心功能深度整合的笔记系统，支持拖拽、思维导图、结构化模板等，帮助用户整理和重组信息。
+ **内容抓取与整合**: 能够抓取网页和PDF文档中的正文内容，方便用户在平台内直接阅读和分析参考文献。

## 系统架构
本平台采用前后端分离的三层架构：

+ **前端 (Frontend)**: 用户直接交互的Web界面，使用 **React.js** 构建。
+ **后端 (Backend)**: 作为前端与AI模型之间的桥梁，使用 **Python** 和 **FastAPI** 实现。
+ **AI模型 & 数据源**:
    - **大语言模型 (LLM) API**: 调用成熟的LLM API（如 DEEPSEEK）作为认知向导。
    - **维基百科 (Wikipedia) API**: 集成维基百科API作为可验证的数据源。

## 技术栈
| 类别 | 技术选型 |
| :--- | :--- |
| **前端** | React.js, Ant Design, React Flow |
| **后端** | Python, FastAPI |
| **数据库** | SQLite (开发) / Supabase (部署) |
| **AI核心** | 商业LLM API (如: DEEPSEEK) |
| **数据源** | Wikipedia-API (Python库) |
| **内容抓取** | Trafilatura (Python库) |
| **部署** | Vercel (前端) / Serverless (后端) |


## 快速开始
### 环境准备
+ Node.js
+ Python 3.x
+ pip

### 前端
```bash
# 进入前端目录
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm start
```

### 后端
```bash
# 进入后端目录
cd backend

# 安装依赖
pip install -r requirements.txt

# 启动开发服务器
uvicorn app.main:app --reload
```

## 项目结构
```plain
.
├── frontend/         # 前端 React 应用
│   ├── public/
│   └── src/
├── backend/          # 后端 FastAPI 应用
│   ├── app/
│   │   ├── routers/  # API 路由
│   │   ├── schemas/  # Pydantic 数据模型
│   │   └── services/ # 业务逻辑
│   └── main.py       # FastAPI 应用入口
└── README.md
```


# AI引导的历史探究学习平台
这是一个AI引导的历史探究学习平台，旨在帮助用户在历史学习中培养批判性思维。平台通过结构化的探究流程和AI引导的苏格拉底式对话，引导用户深入分析历史事件，辨析多元观点，并形成自己的结论。

## 特色功能
+ **引导式探究流程**: 平台提供四大核心功能模块，构建系统化的探究路径，包括史实认知、观点辨析、史料分析和反思总结。
+ **AI认知向导**: 采用苏格拉底式对话的AI引导模型，通过提问而非直接回答的方式，激发用户的批判性思考。
+ **多功能笔记系统**: 提供与探究核心功能深度整合的笔记系统，支持拖拽、思维导图、结构化模板等，帮助用户整理和重组信息。
+ **内容抓取与整合**: 能够抓取网页和PDF文档中的正文内容，方便用户在平台内直接阅读和分析参考文献。

## 系统架构
本平台采用前后端分离的三层架构：

+ **前端 (Frontend)**: 用户直接交互的Web界面，使用 **React.js** 构建。
+ **后端 (Backend)**: 作为前端与AI模型之间的桥梁，使用 **Python** 和 **FastAPI** 实现。
+ **AI模型 & 数据源**:
    - **大语言模型 (LLM) API**: 调用成熟的LLM API（如 DEEPSEEK）作为认知向导。
    - **维基百科 (Wikipedia) API**: 集成维基百科API作为可验证的数据源。

## 技术栈
| 类别 | 技术选型 |
| :--- | :--- |
| **前端** | React.js, Ant Design, React Flow |
| **后端** | Python, FastAPI |
| **数据库** | SQLite (开发) / Supabase (部署) |
| **AI核心** | 商业LLM API (如: DEEPSEEK) |
| **数据源** | Wikipedia-API (Python库) |
| **内容抓取** | Trafilatura (Python库) |
| **部署** | Vercel (前端) / Serverless (后端) |


## 快速开始
### 环境准备
+ Node.js
+ Python 3.x
+ pip

### 前端
```bash
# 进入前端目录
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm start
```

### 后端
```bash
# 进入后端目录
cd backend

# 安装依赖
pip install -r requirements.txt

# 启动开发服务器
uvicorn app.main:app --reload
```

## 项目结构
```plain
.
├── frontend/         # 前端 React 应用
│   ├── public/
│   └── src/
├── backend/          # 后端 FastAPI 应用
│   ├── app/
│   │   ├── routers/  # API 路由
│   │   ├── schemas/  # Pydantic 数据模型
│   │   └── services/ # 业务逻辑
│   └── main.py       # FastAPI 应用入口
└── README.md
```

=======
# AI引导的历史探究学习平台
这是一个AI引导的历史探究学习平台，旨在帮助用户在历史学习中培养批判性思维。平台通过结构化的探究流程和AI引导的苏格拉底式对话，引导用户深入分析历史事件，辨析多元观点，并形成自己的结论。

## 特色功能
+ **引导式探究流程**: 平台提供四大核心功能模块，构建系统化的探究路径，包括史实认知、观点辨析、史料分析和反思总结。
+ **AI认知向导**: 采用苏格拉底式对话的AI引导模型，通过提问而非直接回答的方式，激发用户的批判性思考。
+ **智能观点辨析**: 自动调取维基百科讨论页内容，使用AI分析生成对立观点和争议要点，帮助学生理解历史事件的多面性。
+ **多功能笔记系统**: 提供与探究核心功能深度整合的笔记系统，支持拖拽、思维导图、结构化模板等，帮助用户整理和重组信息。
+ **内容抓取与整合**: 能够抓取网页和PDF文档中的正文内容，方便用户在平台内直接阅读和分析参考文献。

## 系统架构
本平台采用前后端分离的三层架构：

+ **前端 (Frontend)**: 用户直接交互的Web界面，使用 **React.js** 构建。
+ **后端 (Backend)**: 作为前端与AI模型之间的桥梁，使用 **Python** 和 **FastAPI** 实现。
+ **AI模型 & 数据源**:
    - **大语言模型 (LLM) API**: 调用成熟的LLM API（如 DEEPSEEK）作为认知向导。
    - **维基百科 (Wikipedia) API**: 集成维基百科API作为可验证的数据源。

## 技术栈
| 类别 | 技术选型 |
| :--- | :--- |
| **前端** | React.js, Ant Design, React Flow |
| **后端** | Python, FastAPI |
| **数据库** | SQLite (开发) / Supabase (部署) |
| **AI核心** | 商业LLM API (如: DEEPSEEK) |
| **数据源** | Wikipedia-API (Python库) |
| **内容抓取** | Trafilatura (Python库) |
| **部署** | Vercel (前端) / Serverless (后端) |


## 快速开始
### 环境准备
+ Node.js
+ Python 3.x
+ pip

### 前端
```bash
# 进入前端目录
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm start
```

### 后端
```bash
# 进入后端目录
cd backend

# 安装依赖
pip install -r requirements.txt

# 启动开发服务器
uvicorn app.main:app --reload
```

## 功能模块详解

### 模块一：史实认知
- **功能**: 获取维基百科主题页面内容
- **API**: `GET /api/v1/topic/{topic_name}`
- **返回**: 主题摘要和关键时间线
- **实现**: 调用维基百科API + LLM分析生成结构化内容

### 模块二：观点辨析
- **功能**: 分析历史事件的对立观点和争议要点
- **API**: `GET /api/v1/viewpoints/{topic_name}`
- **返回**: 对立观点列表和维基讨论页摘要
- **实现**: 获取维基百科讨论页内容 + LLM分析生成观点对比

### 模块三：史料分析
- **功能**: 多史料片段对读分析
- **实现**: 网页内容抓取和PDF文档解析

### 模块四：反思总结
- **功能**: 引导用户回顾并形成结论
- **实现**: 结构化模板和AI引导对话

## 项目结构
```plain
.
├── frontend/         # 前端 React 应用
│   ├── public/
│   └── src/
│       ├── pages/    # 页面组件
│       └── api.js    # API调用封装
├── backend/          # 后端 FastAPI 应用
│   ├── app/
│   │   ├── routers/  # API 路由
│   │   │   ├── wiki.py      # 维基百科相关API
│   │   │   ├── chat.py      # AI对话API
│   │   │   └── scrape.py    # 内容抓取API
│   │   ├── schemas/  # Pydantic 数据模型
│   │   └── services/ # 业务逻辑
│   │       ├── wikipedia_service.py  # 维基百科服务
│   │       ├── llm_service.py        # LLM服务
│   │       └── scraping_service.py   # 抓取服务
│   └── main.py       # FastAPI 应用入口
└── README.md
```

>>>>>>> a2eda03fc59ca064582f7fba64a240e3b7e36f8d

## 最新更新

### 2024年更新 - 繁体字转简体字优化（简化方案）
- **繁简转换库**：使用 `opencc-python-reimplemented` 库在输出时自动转换繁体字为简体字
- **维基百科API**：保持使用繁体中文API (`zh`)，避免SSL连接问题
- **自动转换**：在所有API返回数据时自动进行繁简转换，确保前端显示简体字
- **内容显示优化**：确保前端显示的所有内容（包括"阅读原文"和"阅读完整讨论页"）都使用简体字

### 技术细节
- 添加了 `opencc-python-reimplemented` 依赖到 `requirements.txt`
- 在 `wikipedia_service.py` 中添加了 `convert_to_simplified()` 函数
- 在所有API返回数据时应用繁简转换
- 保持了原有的功能逻辑，只是增加了输出时的转换步骤

### 安装新依赖
```bash
cd backend
pip install opencc-python-reimplemented
```

### 2024年重大更新 - 历史探险家主线任务系统
- **主线任务框架**：引入"历史探险家"角色扮演模式，将学习设计为有始有终的探险任务
- **任务进度系统**：实时显示学习进度，完成任务获得徽章奖励
- **智能导师升级**：AI助手从被动问答升级为主动引导的智能导师
- **成就系统**：完成任务获得"历史记录员"、"辩论大师"、"证据收集者"、"历史探险家大师"等徽章
- **最终报告生成**：完成所有任务后可生成完整的历史调查报告
- **游戏化学习**：通过进度条、徽章、任务完成提示等元素增强学习动机

### 学习主线设计
1. **任务一：史实认知** - 建立历史事件的基本框架
2. **任务二：观点辨析** - 分析不同立场和争议  
3. **任务三：史料分析** - 对比多方史料证据
4. **任务四：因果链分析** - 形成你的历史判断

### 技术实现
- 添加了任务进度状态管理（pending/active/completed）
- 实现了QuestProgress组件显示真实学习进度
- 升级了ModuleHeader组件支持任务状态显示
- 增强了AI聊天机器人的引导功能
- 添加了"标记任务完成"按钮，让用户主动控制进度
- 添加了最终报告生成功能

### 进度系统说明
- **初始状态**：所有任务显示为"pending"状态
- **激活状态**：数据加载完成后任务变为"active"状态
- **完成状态**：用户点击"标记任务完成"后变为"completed"状态
- **进度条**：只计算真正完成的任务数量，不是激活的任务数量