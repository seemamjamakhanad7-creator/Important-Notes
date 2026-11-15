# Important Notes

A PDF-based study assistant designed to help students understand and revise their study materials more efficiently.

## Features

- Upload and validate PDF documents.
- Extract text from uploaded PDFs.
- Generate automatic summaries.
- Identify key points.
- Generate structured study notes.
- Ask questions based on uploaded documents.
- Copy generated study notes.

## Technologies Used

**Frontend**
- HTML
- CSS
- JavaScript

**Backend**
- Python
- FastAPI
- PyMuPDF

## Project Structure

```text
Important-Notes/
├── Frontend/
│   ├── index.html
│   ├── style.css
│   └── script.js
├── backend/
│   └── main.py
├── .gitignore
└── README.md
```

## How to Run

### 1. Start the Backend

Open a terminal inside the backend folder and run:

```bash
python -m uvicorn main:app --reload
```

### 2. Start the Frontend

Open `Frontend/index.html` using VS Code Live Server.

## Limitations

- Currently supports text-based PDFs.
- Scanned PDFs are not supported.
- Question answering uses keyword matching.
- Uploaded document data is stored temporarily in memory.

## Future Improvements

- AI-powered question answering.
- OCR support for scanned PDFs.
- Improved document understanding.
- Flashcards and quiz generation.

---

Developed as a student project.