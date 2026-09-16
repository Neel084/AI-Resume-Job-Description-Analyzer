from langchain_groq import ChatGroq

from langchain_core.messages import (
    SystemMessage,
    HumanMessage,
    AIMessage
)

from app.schemas.job_match_schema import JobMatchAnalysis

from dotenv import load_dotenv


# =========================================================
# LOAD ENVIRONMENT VARIABLES
# =========================================================

load_dotenv()


# =========================================================
# GROQ AI MODEL
# =========================================================

llm = ChatGroq(
    model="openai/gpt-oss-20b",
    temperature=0.2,
    max_tokens=12000,
    reasoning_effort="low",
    reasoning_format="hidden"
)


# =========================================================
# NORMAL AI CHAT
# =========================================================
def ask_ai(messages: list, resume_text: str | None = None):
    system_prompt = """
You are an AI Career Assistant.

Your job is to answer the user's CURRENT request accurately.

You can help with:
- Resume improvement
- Job recommendations
- Job searching and preparation
- Career planning
- Skills and learning roadmaps
- Interview preparation
- Professional development

IMPORTANT RULES:
1. Always answer the user's CURRENT question.
2. Do NOT automatically perform a full resume analysis unless the user asks for resume analysis/review.
3. If the user asks for job recommendations based on their resume, recommend suitable job roles based on the ACTUAL resume provided below.
4. Do not invent skills, experience, education, projects, or achievements that are not present in the resume.
5. If resume context is available, treat it as the authoritative source for the user's resume.
6. Give clear, practical and useful answers.
"""

    chat_messages = [
        SystemMessage(content=system_prompt)
    ]

    # Add actual uploaded resume as context
    if resume_text:
        chat_messages.append(
            SystemMessage(
                content=f"""
The following is the user's ACTUAL uploaded resume.

Use this resume as the source of truth when the user asks questions
about their resume, skills, experience, education, projects, or suitable jobs.

--- ACTUAL RESUME ---
{resume_text}
--- END ACTUAL RESUME ---
"""
            )
        )

    # Add conversation history
    for message in messages:
        if message["role"] == "user":
            chat_messages.append(
                HumanMessage(content=message["content"])
            )

        elif message["role"] == "assistant":
            chat_messages.append(
                AIMessage(content=message["content"])
            )

    response = llm.invoke(chat_messages)

    return response.content
# =========================================================
# STREAMING AI CHAT
# =========================================================

def ask_ai_stream(messages: list, resume_text: str | None = None):
    system_prompt = """
You are an AI Career Assistant.

Your job is to answer the user's CURRENT request accurately.

You can help with:
- Resume improvement
- Job recommendations
- Job searching and preparation
- Career planning
- Skills and learning roadmaps
- Interview preparation
- Professional development

IMPORTANT RULES:
1. Always answer the user's CURRENT question.
2. Do NOT automatically perform a full resume analysis unless the user asks for resume analysis/review.
3. If the user asks for job recommendations based on their resume, recommend suitable job roles based on the ACTUAL resume provided below.
4. Do not invent skills, experience, education, projects, or achievements that are not present in the resume.
5. If resume context is available, treat it as the authoritative source for the user's resume.
6. Give clear, practical and useful answers.
"""

    chat_messages = [
        SystemMessage(content=system_prompt)
    ]

    # Add actual uploaded resume as context
    if resume_text:
        chat_messages.append(
            SystemMessage(
                content=f"""
The following is the user's ACTUAL uploaded resume.

Use this resume as the source of truth when the user asks questions
about their resume, skills, experience, education, projects, or suitable jobs.

--- ACTUAL RESUME ---
{resume_text}
--- END ACTUAL RESUME ---
"""
            )
        )

    # Add conversation history
    for message in messages:
        if message["role"] == "user":
            chat_messages.append(
                HumanMessage(content=message["content"])
            )

        elif message["role"] == "assistant":
            chat_messages.append(
                AIMessage(content=message["content"])
            )

    for chunk in llm.stream(chat_messages):
        if chunk.content:
            yield chunk.content


# =========================================================
# RESUME ANALYSIS PROMPT
# =========================================================

RESUME_ANALYSIS_SYSTEM_PROMPT = """
You are an expert AI Resume Reviewer and Career Assistant.

Your task is to analyze the candidate's resume and produce a structured,
professional resume evaluation report.

IMPORTANT RULES:

- Analyze ONLY information actually present in the resume.
- NEVER invent skills, experience, education, projects, achievements,
  certifications, numbers, metrics, employers, dates, or technologies.
- If something important is missing, clearly say that it is missing.
- Do not assume information that is not written in the resume.
- Give practical and specific recommendations.
- Do not rewrite the entire resume.
- Use Markdown formatting exactly according to the structure below.

Your response MUST follow this structure:

# 📊 Resume Score

Give an overall score out of 10.

Then provide this table:

| Category | Score |
|----------|-------|
| Content | X/10 |
| Skills | X/10 |
| Experience | X/10 |
| Projects | X/10 |
| ATS Compatibility | X/10 |
| Formatting | X/10 |

Then give a short explanation of the overall score.

---

# 💪 Key Strengths

Give 3–6 strengths that are actually supported by the resume.

Use bullet points.

---

# ⚠️ Weaknesses & Missing Information

Identify actual weaknesses or missing information.

For every important weakness explain:

- What is missing or weak
- Why it matters
- What the candidate should improve

Do not invent missing information.

---

# 🛠️ Skills Analysis

## 💻 Technical Skills

List the technical skills explicitly found in the resume.

## 🤝 Soft Skills

List soft skills only if they are supported by the resume.

## 📚 Recommended Skills

Suggest skills that would be useful for the candidate's apparent career direction.

Clearly label these as RECOMMENDED.

Do not claim that the candidate already has them.

---

# 🤖 ATS Analysis

Give an ATS score out of 100.

Analyze:

- Keywords
- Section structure
- Formatting
- Readability
- Job-role relevance
- Missing keywords

Then give specific ATS improvement recommendations.

---

# 📁 Projects & Experience Analysis

Analyze the important projects and experience mentioned in the resume.

For each one discuss:

- What is good
- What is weak
- Technical depth
- Technologies used
- Impact
- Results
- Measurable achievements
- How it could be improved

Never create metrics or achievements that are not present.

---

# ✍️ Resume Improvements

Give prioritized improvements.

Use this format:

### 🔴 High Priority

1. Improvement
2. Improvement

### 🟡 Medium Priority

1. Improvement
2. Improvement

### 🟢 Long Term

1. Improvement
2. Improvement

Give examples where useful, but do not rewrite the entire resume.

---

# 🚀 Action Plan

Give the candidate a short practical action plan.

Include:

### 🔴 High Priority

The most important things to fix first.

### 🟡 Medium Priority

Things to improve after the high-priority changes.

### 🟢 Long Term

Things that can improve the resume/career over time.

Finish with a short overall recommendation.

Keep the report professional, clear, and easy to understand.
"""


# =========================================================
# NORMAL RESUME ANALYSIS
# =========================================================

def analyze_resume(resume_text: str):

    system_message = SystemMessage(
        content=RESUME_ANALYSIS_SYSTEM_PROMPT
    )

    human_message = HumanMessage(
        content=f"""
Analyze the following resume.

---------------- RESUME ----------------

{resume_text}

-------------- END RESUME --------------

Remember:

1. Use ONLY information present in the resume.
2. Never invent information.
3. Clearly distinguish existing skills from recommended skills.
4. Follow the exact report structure provided in the system instructions.
"""
    )

    response = llm.invoke(
        [
            system_message,
            human_message
        ]
    )

    return response.content


# =========================================================
# STREAMING RESUME ANALYSIS
# =========================================================

def analyze_resume_stream(resume_text: str):

    system_message = SystemMessage(
        content=RESUME_ANALYSIS_SYSTEM_PROMPT
    )

    human_message = HumanMessage(
        content=f"""
Analyze the following resume.

---------------- RESUME ----------------

{resume_text}

-------------- END RESUME --------------

Remember:

1. Use ONLY information present in the resume.
2. Never invent information.
3. Clearly distinguish existing skills from recommended skills.
4. Follow the exact report structure provided in the system instructions.
"""
    )

    for chunk in llm.stream(
        [
            system_message,
            human_message
        ]
    ):

        if chunk.content:
            yield chunk.content


# =========================================================
# JOB DESCRIPTION MATCHING
# =========================================================

def analyze_resume_against_job(
    resume_text: str,
    job_description: str
):

    structured_llm = llm.with_structured_output(
        JobMatchAnalysis,
        method="json_schema",
        strict=True
    )

    system_message = SystemMessage(
        content="""
You are an expert AI Resume and Job Matching Analyst.

Compare the candidate's resume against the target
job description.

IMPORTANT RULES:

1. Use ONLY information explicitly present in the
   resume and job description.

2. NEVER invent:

   - skills
   - experience
   - education
   - certifications
   - projects
   - technologies
   - employers
   - dates
   - achievements

3. A skill not found in the resume must be treated as:

   "Not found in the resume."

4. Do NOT assume that a missing skill means the
   candidate definitely does not know it.

5. Match skills only when they are genuinely relevant.

6. Give an honest match score from 0 to 100.

7. Classification must be exactly one of:

   - Strong Match
   - Moderate Match
   - Low Match

8. Missing skills must only contain requirements
   that are actually present in the job description.

9. Do not recommend keyword stuffing.

10. Tailoring suggestions must be specific to
    this particular job description.

11. Keep the answer factual and concise.

12. For scoring:

    - Technical Skills
    - Experience
    - Education / Qualifications
    - Projects
    - Keywords

    Each must be between 0 and 100.

13. Overall match must also be between 0 and 100.

14. The final assessment must honestly explain
    whether the candidate appears ready to apply.

Return ONLY the structured fields requested
by the JobMatchAnalysis schema.
"""
    )

    human_message = HumanMessage(
        content=f"""
Compare the following resume against the
following job description.

================ RESUME ================

{resume_text}

============== END RESUME ==============


================ JOB DESCRIPTION ================

{job_description}

============== END JOB DESCRIPTION ==============
"""
    )

    response = structured_llm.invoke(
        [
            system_message,
            human_message
        ]
    )

    return response.model_dump()