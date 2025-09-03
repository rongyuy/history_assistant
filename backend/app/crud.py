# backend/app/crud.py
from sqlalchemy.orm import Session
from .models import models
from .schemas import main_schemas
import uuid

# --- Inquiry 操作 ---
def get_inquiry(db: Session, inquiry_id: str):
    return db.query(models.Inquiry).filter(models.Inquiry.id == inquiry_id).first()

def create_inquiry(db: Session, topic: str, user_id: str = "default_user"):
    db_inquiry = models.Inquiry(id=str(uuid.uuid4()), topic=topic, user_id=user_id)
    db.add(db_inquiry)
    db.commit()
    db.refresh(db_inquiry)
    return db_inquiry

# --- Notes 和 Connections 操作 ---
def get_notes_and_connections(db: Session, inquiry_id: str):
    notes = db.query(models.Note).filter(models.Note.inquiry_id == inquiry_id).all()
    connections = db.query(models.Connection).filter(models.Connection.inquiry_id == inquiry_id).all()
    return {"notes": notes, "connections": connections}

def save_notes_and_connections(db: Session, inquiry_id: str, data: dict):
    # 简单的同步策略：先删除旧数据，再写入新数据
    db.query(models.Note).filter(models.Note.inquiry_id == inquiry_id).delete()
    db.query(models.Connection).filter(models.Connection.inquiry_id == inquiry_id).delete()

    # 写入新的笔记
    for note_data in data.get("notes", []):
        db_note = models.Note(**note_data, inquiry_id=inquiry_id)
        db.add(db_note)

    # 写入新的连接
    for conn_data in data.get("connections", []):
        db_conn = models.Connection(**conn_data, inquiry_id=inquiry_id)
        db.add(db_conn)
    
    db.commit()
    return {"status": "success"}