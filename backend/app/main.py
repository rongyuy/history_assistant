from fastapi import FastAPI,Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from . import crud, database
from .routers import chat, scrape, wiki
from .models import models

# 在应用启动时创建数据库表
models.create_db_and_tables()

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

# --- 新增数据库API端点 ---
@app.post("/api/v1/inquiries/", status_code=201)
def create_new_inquiry(topic: str, db: Session = Depends(database.get_db)):
    """
    开始一个新的探究，并为其创建一个唯一的ID
    """
    return crud.create_inquiry(db=db, topic=topic)

@app.get("/api/v1/inquiries/{inquiry_id}/notes")
def get_notes(inquiry_id: str, db: Session = Depends(database.get_db)):
    """
    获取指定探究项目的所有笔记和连接
    """
    return crud.get_notes_and_connections(db=db, inquiry_id=inquiry_id)

@app.post("/api/v1/inquiries/{inquiry_id}/notes")
def save_notes(inquiry_id: str, data: dict, db: Session = Depends(database.get_db)):
    """
    保存或更新指定探究项目的所有笔记和连接
    """
    return crud.save_notes_and_connections(db=db, inquiry_id=inquiry_id, data=data)