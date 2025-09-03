# backend/app/models/models.py
from sqlalchemy import create_engine, Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
import datetime

# 数据库连接URL, 我们先使用SQLite进行本地开发
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

Base = declarative_base()

class Inquiry(Base):
    __tablename__ = "inquiries"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String) # 未来扩展用
    topic = Column(String, index=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    notes = relationship("Note", back_populates="inquiry", cascade="all, delete-orphan")
    connections = relationship("Connection", back_populates="inquiry", cascade="all, delete-orphan")

class Note(Base):
    __tablename__ = "notes"

    id = Column(String, primary_key=True, index=True)
    inquiry_id = Column(String, ForeignKey("inquiries.id"))
    content = Column(String)
    type = Column(String)
    position_x = Column(Integer)
    position_y = Column(Integer)

    inquiry = relationship("Inquiry", back_populates="notes")

class Connection(Base):
    __tablename__ = "connections"

    id = Column(String, primary_key=True, index=True)
    inquiry_id = Column(String, ForeignKey("inquiries.id"))
    source_note_id = Column(String, ForeignKey("notes.id"))
    target_note_id = Column(String, ForeignKey("notes.id"))

    inquiry = relationship("Inquiry", back_populates="connections")

# 创建所有定义的表
def create_db_and_tables():
    Base.metadata.create_all(bind=engine)