from fastapi import (
    APIRouter,
    Depends,
    HTTPException
)

from sqlalchemy.orm import Session

from app.database.database import get_db
from app.database.models import Conversation


router = APIRouter(
    prefix="/conversations",
    tags=["Conversations"]
)


# =========================================================
# CREATE NEW CONVERSATION
# =========================================================

@router.post("/")
def create_conversation(
    db: Session = Depends(get_db)
):
    conversation = Conversation(
        title="New Chat"
    )

    db.add(conversation)
    db.commit()
    db.refresh(conversation)

    return {
        "id": conversation.id,
        "title": conversation.title,
        "created_at": conversation.created_at
    }


# =========================================================
# GET ALL CONVERSATIONS
# =========================================================

@router.get("/")
def get_conversations(
    db: Session = Depends(get_db)
):
    conversations = db.query(
        Conversation
    ).order_by(
        Conversation.updated_at.desc()
    ).all()

    return [
        {
            "id": conversation.id,
            "title": conversation.title,
            "created_at": conversation.created_at,
            "updated_at": conversation.updated_at
        }
        for conversation in conversations
    ]


# =========================================================
# RENAME CONVERSATION
# =========================================================

@router.patch("/{conversation_id}")
def rename_conversation(
    conversation_id: int,
    title: str,
    db: Session = Depends(get_db)
):

    conversation = db.query(
        Conversation
    ).filter(
        Conversation.id == conversation_id
    ).first()

    if conversation is None:
        raise HTTPException(
            status_code=404,
            detail="Conversation not found"
        )

    title = title.strip()

    if not title:
        raise HTTPException(
            status_code=400,
            detail="Title cannot be empty"
        )

    conversation.title = title[:100]

    db.commit()
    db.refresh(conversation)

    return {
        "id": conversation.id,
        "title": conversation.title
    }


# =========================================================
# DELETE CONVERSATION
# =========================================================

@router.delete("/{conversation_id}")
def delete_conversation(
    conversation_id: int,
    db: Session = Depends(get_db)
):

    conversation = db.query(
        Conversation
    ).filter(
        Conversation.id == conversation_id
    ).first()

    if conversation is None:
        raise HTTPException(
            status_code=404,
            detail="Conversation not found"
        )

    db.delete(conversation)
    db.commit()

    return {
        "(message)": "Conversation deleted successfully",
        "conversation_id": conversation_id
    }