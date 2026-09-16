from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from fastapi.responses import StreamingResponse

from app.database.database import get_db
from app.database.models import Conversation, Message
from app.schemas.chat_schema import MessageCreate
from app.services.ai_service import ask_ai, ask_ai_stream


router = APIRouter(
    prefix="/conversations",
    tags=["Messages"]
)


# =========================================================
# CREATE MESSAGE
# =========================================================

@router.post("/{conversation_id}/messages")
def create_message(
    conversation_id: int,
    message: MessageCreate,
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

    new_message = Message(
        conversation_id=conversation_id,
        role=message.role,
        content=message.content
    )

    db.add(new_message)

    conversation.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(new_message)

    return {
        "id": new_message.id,
        "conversation_id": new_message.conversation_id,
        "role": new_message.role,
        "content": new_message.content,
        "created_at": new_message.created_at
    }


# =========================================================
# GET ALL MESSAGES OF ONE CONVERSATION
# =========================================================

@router.get("/{conversation_id}/messages")
def get_messages(
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

    messages = db.query(
        Message
    ).filter(
        Message.conversation_id == conversation_id
    ).order_by(
        Message.created_at.asc(),
        Message.id.asc()
    ).all()

    return [
        {
            "id": message.id,
            "conversation_id": message.conversation_id,
            "role": message.role,
            "content": message.content,
            "created_at": message.created_at
        }
        for message in messages
    ]


# =========================================================
# NORMAL AI CHAT
# =========================================================

@router.post("/{conversation_id}/chat")
def chat_with_ai(
    conversation_id: int,
    message: MessageCreate,
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

    # -----------------------------------------------------
    # Automatically create title from first user message
    # -----------------------------------------------------

    if (
        conversation.title == "New Chat"
        and message.content.strip()
    ):
        conversation.title = message.content.strip()[:50]

    # -----------------------------------------------------
    # Save user message
    # -----------------------------------------------------

    user_message = Message(
        conversation_id=conversation_id,
        role="user",
        content=message.content
    )

    db.add(user_message)

    conversation.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(user_message)

    # -----------------------------------------------------
    # Get previous conversation messages
    # -----------------------------------------------------

    previous_messages = db.query(
        Message
    ).filter(
        Message.conversation_id == conversation_id
    ).order_by(
        Message.created_at.asc(),
        Message.id.asc()
    ).all()

    chat_history = [
        {
            "role": msg.role,
            "content": msg.content
        }
        for msg in previous_messages
    ]

    # -----------------------------------------------------
    # Get AI response
    # -----------------------------------------------------

    ai_response = ask_ai(
        chat_history,
        resume_text=conversation.resume_text
    )

    # -----------------------------------------------------
    # Save AI response
    # -----------------------------------------------------

    assistant_message = Message(
        conversation_id=conversation_id,
        role="assistant",
        content=ai_response
    )

    db.add(assistant_message)

    conversation.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(assistant_message)

    return {
        "conversation_id": conversation_id,

        "user_message": {
            "id": user_message.id,
            "role": user_message.role,
            "content": user_message.content
        },

        "assistant_message": {
            "id": assistant_message.id,
            "role": assistant_message.role,
            "content": assistant_message.content
        }
    }


# =========================================================
# STREAMING AI CHAT
# =========================================================

@router.post("/{conversation_id}/chat/stream")
def chat_with_ai_stream(
    conversation_id: int,
    message: MessageCreate,
    db: Session = Depends(get_db)
):

    # -----------------------------------------------------
    # Check conversation
    # -----------------------------------------------------

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

    # -----------------------------------------------------
    # Automatically create title
    # -----------------------------------------------------

    if (
        conversation.title == "New Chat"
        and message.content.strip()
    ):
        conversation.title = message.content.strip()[:50]

    # -----------------------------------------------------
    # Save user message
    # -----------------------------------------------------

    user_message = Message(
        conversation_id=conversation_id,
        role="user",
        content=message.content
    )

    db.add(user_message)

    conversation.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(user_message)

    # -----------------------------------------------------
    # Get conversation history
    # -----------------------------------------------------

    previous_messages = db.query(
        Message
    ).filter(
        Message.conversation_id == conversation_id
    ).order_by(
        Message.created_at.asc(),
        Message.id.asc()
    ).all()

    chat_history = [
        {
            "role": msg.role,
            "content": msg.content
        }
        for msg in previous_messages
    ]

    # -----------------------------------------------------
    # Streaming generator
    # -----------------------------------------------------

    def generate():

        full_response = ""

        try:

            # -------------------------------------------------
            # Stream AI response
            # -------------------------------------------------

            for chunk in ask_ai_stream(
                chat_history,
                resume_text=conversation.resume_text
            ):
                if chunk:
                    full_response += chunk
                    yield chunk

            # -------------------------------------------------
            # Save complete AI response
            # -------------------------------------------------

            assistant_message = Message(
                conversation_id=conversation_id,
                role="assistant",
                content=full_response
            )

            db.add(assistant_message)

            conversation.updated_at = datetime.utcnow()

            db.commit()

        except Exception as error:

            print(
                "Streaming error:",
                error
            )

            db.rollback()

            yield "\n\nSorry, something went wrong."

    return StreamingResponse(
        generate(),
        media_type="text/plain"
    )