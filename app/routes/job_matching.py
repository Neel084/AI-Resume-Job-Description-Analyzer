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
import json
from datetime import datetime

from sqlalchemy.orm import Session

from app.services.pdf_service import extract_text_from_pdf
from app.services.ai_service import analyze_resume_against_job
from app.database.database import get_db
from app.database.models import Conversation, Message


# =========================================================
# ROUTER
# =========================================================

router = APIRouter(
    prefix="/job-matching",
    tags=["Job Matching"]
)


# =========================================================
# UPLOAD DIRECTORY
# =========================================================

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)


# =========================================================
# JOB MATCH ANALYSIS
# =========================================================

@router.post("/analyze/{conversation_id}")
async def analyze_job_match(
    conversation_id: int,
    file: UploadFile = File(...),
    job_description: str = Form(...),
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
    # CHECK PDF
    # =====================================================

    if file.content_type != "application/pdf":
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are allowed"
        )


    # =====================================================
    # CHECK JOB DESCRIPTION
    # =====================================================

    cleaned_job_description = (
        job_description.strip()
    )

    if not cleaned_job_description:

        raise HTTPException(
            status_code=400,
            detail="Job description is required"
        )


    # =====================================================
    # SAVE RESUME
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

        resume_text = extract_text_from_pdf(
            str(file_path)
        )

        if not resume_text.strip():

            raise HTTPException(
                status_code=400,
                detail="Could not extract text from the PDF"
            )


        # =================================================
        # SAVE USER MESSAGE
        # =================================================

        user_content = (
            "🎯 Job Match Analysis\n\n"
            f"Resume: {filename}\n\n"
            "Job Description:\n"
            + cleaned_job_description
        )

        user_message = Message(
            conversation_id=conversation_id,
            role="user",
            content=user_content
        )


        # =================================================
        # UPDATE CONVERSATION
        # =================================================

        if conversation.title == "New Chat":

            conversation.title = (
                "🎯 Job Match Analysis"
            )

        conversation.updated_at = datetime.utcnow()

        db.add(user_message)

        db.commit()

        db.refresh(user_message)


        # =================================================
        # AI JOB MATCH ANALYSIS
        # =================================================

        analysis = analyze_resume_against_job(
            resume_text,
            cleaned_job_description
        )


        # =================================================
        # SAVE AI RESPONSE
        # =================================================

        job_match_payload = json.dumps(
            analysis,
            ensure_ascii=False
        )

        assistant_message = Message(
            conversation_id=conversation_id,
            role="assistant",
            content=(
                "[JOB_MATCH_JSON]\n"
                + job_match_payload
            )
        )

        db.add(assistant_message)

        conversation.updated_at = datetime.utcnow()

        db.commit()

        db.refresh(assistant_message)


        # =================================================
        # RETURN RESULT
        # =================================================

        return {
            "success": True,
            "message": "Job matching completed successfully",
            "analysis": analysis
        }


    except HTTPException:

        db.rollback()

        raise


    except Exception as error:

        db.rollback()

        print(
            "Job matching error:",
            error
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to analyze resume "
                "against job description"
            )
        )