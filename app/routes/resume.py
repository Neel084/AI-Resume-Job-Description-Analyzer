from fastapi import (
    APIRouter,
    UploadFile,
    File,
    HTTPException,
    Form,
    Depends
)

from pathlib import Path
import shutil
from datetime import datetime

from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.services.pdf_service import extract_text_from_pdf
from app.services.ai_service import analyze_resume_stream

from app.database.database import get_db
from app.database.models import Conversation, Message


# =========================================================
# ROUTER
# =========================================================

router = APIRouter(
    prefix="/resume",
    tags=["Resume"]
)


# =========================================================
# UPLOAD DIRECTORY
# =========================================================

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)


# =========================================================
# UPLOAD RESUME
# =========================================================

@router.post("/upload")
def upload_resume(
    file: UploadFile = File(...)
):

    if file.content_type != "application/pdf":
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are allowed"
        )

    # Use a safe filename
    filename = Path(file.filename or "resume.pdf").name

    file_path = UPLOAD_DIR / filename

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(
            file.file,
            buffer
        )

    return {
        "filename": filename,
        "message": "Resume uploaded successfully",
        "path": str(file_path)
    }


# =========================================================
# ANALYZE RESUME
# =========================================================

@router.post("/analyze/{conversation_id}")
async def analyze_uploaded_resume(
    conversation_id: int,
    file: UploadFile = File(...),
    message: str = Form(""),
    db: Session = Depends(get_db)
):

    # =====================================================
    # CHECK CONVERSATION
    # =====================================================

    conversation = (
        db.query(Conversation)
        .filter(
            Conversation.id == conversation_id
        )
        .first()
    )

    if conversation is None:
        raise HTTPException(
            status_code=404,
            detail="Conversation not found"
        )


    # =====================================================
    # CHECK FILE
    # =====================================================

    if file.content_type != "application/pdf":
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are allowed"
        )


    # =====================================================
    # SAVE PDF
    # =====================================================

    filename = Path(
        file.filename or "resume.pdf"
    ).name

    file_path = UPLOAD_DIR / filename

    try:

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(
                file.file,
                buffer
            )


        # =================================================
        # EXTRACT RESUME TEXT
        # =================================================

        resume_text = extract_text_from_pdf(str(file_path))

        # Save actual resume text in conversation
        conversation.resume_text = resume_text
        db.commit()

        if message:
            user_message = Message(
                conversation_id=conversation_id,
                role="user",
                content=message
            )
            db.add(user_message)
            db.commit()


        # =================================================
        # SAVE USER MESSAGE
        # =================================================

        if message.strip():

            user_message = Message(
                conversation_id=conversation_id,
                role="user",
                content=message.strip()
            )

            db.add(user_message)


        # =================================================
        # UPDATE CONVERSATION
        # =================================================

        if conversation.title == "New Chat":

            conversation.title = "📄 Resume Analysis"

        conversation.updated_at = datetime.utcnow()

        db.commit()


        # =================================================
        # STREAM AI ANALYSIS
        # =================================================

        async def generate():

            full_analysis = ""

            try:

                for chunk in analyze_resume_stream(
                    resume_text
                ):

                    if chunk:

                        full_analysis += chunk

                        yield chunk


                # =========================================
                # SAVE AI RESPONSE
                # =========================================

                if full_analysis.strip():

                    assistant_message = Message(
                        conversation_id=conversation_id,
                        role="assistant",
                        content=(
                            "📄 Resume Analysis\n\n"
                            + full_analysis
                        )
                    )

                    db.add(
                        assistant_message
                    )

                    conversation.updated_at = (
                        datetime.utcnow()
                    )

                    db.commit()


            except Exception as error:

                print(
                    "Resume streaming error:",
                    error
                )

                db.rollback()

                yield (
                    "\n\nSorry, something went wrong "
                    "while analyzing your resume."
                )


        return StreamingResponse(
            generate(),
            media_type="text/plain"
        )


    except HTTPException:

        raise


    except Exception as error:

        print(
            "Resume analysis error:",
            error
        )

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail="Failed to analyze resume"
        )