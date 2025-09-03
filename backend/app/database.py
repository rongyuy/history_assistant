# backend/app/database.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from .models.models import Base # 导入Base

# 在本地开发阶段，使用SQLite
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
# 当你准备好使用Supabase时, 替换为你的连接字符串:
# SQLALCHEMY_DATABASE_URL = "YOUR_SUPABASE_CONNECTION_STRING" 

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False} # SQLite需要这个参数
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 将Base的元数据绑定到engine
Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()