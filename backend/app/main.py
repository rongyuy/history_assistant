from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import chat, scrape, wiki

# 创建 FastAPI 应用实例
app = FastAPI(title="Socratic Learning Platform API")

# 配置 CORS 中间件, 允许前端跨域请求
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # 允许你的React前端源
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 包含各个功能的路由
api_prefix = "/api/v1"
app.include_router(chat.router, prefix=api_prefix, tags=["Chat"])
app.include_router(scrape.router, prefix=api_prefix, tags=["Scraping"])
app.include_router(wiki.router, prefix=api_prefix, tags=["Wikipedia"])

@app.get("/")
def read_root():
    return {"message": "Welcome to the Socratic Learning Platform API"} 