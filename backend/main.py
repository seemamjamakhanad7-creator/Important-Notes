
import os
import json
import uuid
import urllib.request
import urllib.error
import re

import pymupdf
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

class QuestionRequest(BaseModel):
    document_id: str
    question: str

app = FastAPI(title="KnowFlow API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

documents = {}


def call_gemini(prompt):
    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="Gemini API key is not configured."
        )

    url = (
        "https://generativelanguage.googleapis.com/v1beta/"
        "models/gemini-3.8-flash:generateContent"
    )

    payload = {
        "contents": [
            {"parts": [{"text": prompt}]}
        ],
        "generationConfig": {
            "responseMimeType": "application/json"
        }
    }

    request = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "x-goog-api-key": api_key
        },
        method="POST"
    )

    try:
        with urllib.request.urlopen(request, timeout=180) as response:
            result = json.loads(response.read().decode("utf-8"))

        parts = result["candidates"][0]["content"]["parts"]
        return "".join(part.get("text", "") for part in parts)

    except urllib.error.HTTPError as error:
        details = error.read().decode("utf-8", errors="replace")
        raise HTTPException(
            status_code=502,
            detail=f"Gemini API error: {details[:1000]}"
        )
    except Exception as error:
        raise HTTPException(
            status_code=502,
            detail=f"AI request failed: {str(error)}"
        )


@app.get("/")
def home():
    return {"message": "KnowFlow API is running!"}



@app.post("/analyze")
async def analyze(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Please upload a PDF file.")

    contents = await file.read()

    if not contents:
        raise HTTPException(status_code=400, detail="The uploaded PDF is empty.")

    try:
        pdf = pymupdf.open(stream=contents, filetype="pdf")
        extracted_text = "\n".join(page.get_text() for page in pdf)
        pdf.close()
    except Exception:
        raise HTTPException(status_code=400, detail="Could not read this PDF.")

    if not extracted_text.strip():
        raise HTTPException(
            status_code=400,
            detail="No selectable text found. Scanned PDFs are not supported yet."
        )

    extracted_text = extracted_text[:20000]

    
    sentences = [
        s.strip() for s in re.split(r'(?<=[.!?])\s+', extracted_text)
        if len(s.strip()) > 30
    ]

    
    summary = " ".join(sentences[:3])

    if not summary:
        summary = extracted_text[:500]

    
    key_points = sorted(
        sentences,
        key=lambda s: len(s.split()),
        reverse=True
    )[:8]

    
    paragraphs = [
        p.strip() for p in extracted_text.split("\n")
        if len(p.strip()) > 20
    ]

    notes = "## Study Notes\n\n"
    for paragraph in paragraphs[:15]:
        notes += "- " + paragraph + "\n\n"

    document_id = str(uuid.uuid4())
    documents[document_id] = extracted_text

    return {
        "summary": summary,
        "key_points": key_points,
        "notes": notes,
        "document_id": document_id
    }




@app.post("/ask")
def ask_question(request: QuestionRequest):
    if request.document_id not in documents:
        raise HTTPException(
            status_code=404,
            detail="Document not found. Please upload it again."
        )

    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Please enter a question.")

    document = documents[request.document_id]

    if any(phrase in request.question.lower() for phrase in [
        "list all topics",
        "list the topics",
        "topic names",
        "important topics",
        "all topics"
    ]):
        paragraphs = [
            p.strip()
            for p in document.split("\n")
            if p.strip() and len(p.strip()) < 100
        ]

        answer = "## Topics Found in Your Document\n\n"
        answer += "\n".join(
            f"- {topic}" for topic in paragraphs[:20]
        )

        return {"answer": answer}

    
    sentences = [
        s.strip() for s in re.split(r'(?<=[.!?])\s+', document)
        if len(s.strip()) > 25
    ]

    
    stopwords = {
        "what", "is", "are", "the", "a", "an", "in", "on",
        "of", "to", "for", "and", "how", "why", "when",
        "where", "which", "who", "explain", "tell", "me",
        "about", "can", "you", "does", "do", "this"
    }

    question_words = set(
        re.findall(r'\b[a-zA-Z]{3,}\b', request.question.lower())
    ) - stopwords


    scored_sentences = []

    for sentence in sentences:
        words = set(
            re.findall(r'\b[a-zA-Z]{3,}\b', sentence.lower())
        )
        score = len(question_words.intersection(words))

        if score > 0:
            scored_sentences.append((score, sentence))

    scored_sentences.sort(key=lambda item: item[0], reverse=True)

    if not scored_sentences:
        answer = (
            "I couldn't find a directly relevant answer in the uploaded "
            "document. Try asking using keywords from the document."
        )
    else:
        relevant = [item[1] for item in scored_sentences[:5]]

        answer = "## Answer\n\n"
        answer += "\n\n".join("- " + sentence for sentence in relevant)
        answer += "\n\n## Note\n\n"
        answer += (
            "This response is based on matching information "
            "from your uploaded document."
        )

    return {"answer": answer}

