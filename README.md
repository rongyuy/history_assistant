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

