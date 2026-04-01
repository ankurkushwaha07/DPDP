# DPDP Compliance Copilot

AI-powered compliance analysis tool for India's Digital Personal Data Protection Act, 2023.

Upload your product schema and privacy policy -> get a gap report plus ready-to-use compliance documents in under 3 minutes.

## Features

- Data Classification: Classifies your data fields into DPDP categories (identifiers, financial, health, children, sensitive, behavioral)
- Gap Analysis: Compares your privacy policy against DPDP obligation categories with specific section references
- Document Generation: Produces downloadable privacy notices, consent texts, retention matrices, and breach SOPs
- Resilient Architecture: Falls back to rule-based analysis if LLM is unavailable
- Prompt Injection Protection: Sanitizes all user inputs before LLM processing

## Tech Stack

| Component | Technology |
|-----------|------------|
| Backend | Python 3.11, FastAPI, SQLite |
| LLM | Google Gemini 2.5 Flash |
| RAG | ChromaDB + all-MiniLM-L6-v2 |
| Frontend | Next.js 14, Tailwind CSS, TypeScript |
| Hosting | Render (backend) + Vercel (frontend) |

## Quick Start

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Set up environment
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY

# Initialize knowledge base
python -m app.knowledge.ingest --rebuild

# Start server
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

Open `http://localhost:3000`

### Demo (no API key needed)

Visit `http://localhost:3000` and click any "Try Demo" button. Demo scenarios return pre-computed results.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/analyze` | Start async compliance analysis |
| GET | `/api/analyze/{id}/status` | Poll analysis status |
| POST | `/api/generate` | Generate compliance documents |
| GET | `/api/download/{doc_id}` | Download DOCX document |
| GET | `/api/demo/{scenario}` | Pre-computed demo (ecommerce/edtech/healthtech) |
| GET | `/api/history` | Past analyses for this session |
| GET | `/api/health` | System health check |

## Project Structure

```text
dpdp-copilot/
|-- backend/
|   |-- app/
|   |   |-- main.py           # FastAPI endpoints
|   |   |-- config.py         # All settings
|   |   |-- db/               # SQLite schema + connection
|   |   |-- llm/              # Gemini wrapper with retry
|   |   |-- knowledge/        # RAG pipeline (ChromaDB)
|   |   |-- analysis/         # Classification + gap analysis
|   |   |-- security/         # Input sanitization
|   |   |-- generation/       # Document templates + DOCX
|   |   |-- demo/             # Pre-computed scenarios
|   |   `-- models/           # Pydantic schemas
|   |-- data/                 # Runtime data
|   `-- tests/                # Unit + E2E tests
|-- frontend/
|   |-- app/                  # Next.js pages
|   |-- components/           # React components
|   `-- lib/                  # API client
`-- README.md
```

## Testing

```bash
cd backend
python -m pytest tests/ -v
```

## Deployment

### Backend (Render)
1. Push to GitHub.
2. Connect repo on Render.
3. Set `GEMINI_API_KEY` in environment variables.
4. Deploy.

### Frontend (Vercel)
1. Connect repo on Vercel.
2. Set `NEXT_PUBLIC_API_URL` to your Render URL.
3. Deploy.

## License

MIT

## Author

Built by [Ankur Kushwaha](https://linkedin.com/in/ankursingh-kushwaha).
