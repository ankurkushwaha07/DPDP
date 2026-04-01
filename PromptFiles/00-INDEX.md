# DPDP Compliance Copilot — Micro Plan Execution Guide

## How to Use These Files

1. Open your coding agent (Claude Code, Cursor, or any AI coding tool)
2. Copy-paste the contents of **MP-01.md** into the agent
3. Let the agent execute all steps and run the verification
4. Once verification passes, move to **MP-02.md**
5. Repeat until MP-32

**Each MP is self-contained.** The agent gets: goal, dependencies, full code, and verification commands.

## Execution Order (32 Micro Plans)

### PHASE 1: Foundation (~3 hours)
| # | File | What It Builds | Time |
|---|------|----------------|------|
| 01 | MP-01.md | Project structure + config.py + requirements.txt | 15 min |
| 02 | MP-02.md | SQLite schema + database.py | 15 min |
| 03 | MP-03.md | Pydantic models (all request/response types) | 15 min |
| 04 | MP-04.md | Gemini LLM client with retry + fallback + JSON parsing | 20 min |
| 05 | MP-05.md | In-memory cache with TTL | 10 min |
| 06 | MP-06.md | Input sanitizer + prompt injection guard | 15 min |

### PHASE 2: Knowledge Base (~2 hours)
| # | File | What It Builds | Time |
|---|------|----------------|------|
| 07 | MP-07.md | Hardcoded DPDP Act/Rules section map | 15 min |
| 08 | MP-08.md | PDF text chunker with metadata | 20 min |
| 09 | MP-09.md | ChromaDB ingestion pipeline | 25 min |
| 10 | MP-10.md | ChromaDB retriever (semantic + obligation lookup) | 15 min |
| 11 | MP-11.md | ChromaDB maintenance + health check | 10 min |

### PHASE 3: Analysis Engine (~3 hours)
| # | File | What It Builds | Time |
|---|------|----------------|------|
| 12 | MP-12.md | Rule-based fallback classifier | 20 min |
| 13 | MP-13.md | All LLM prompt templates | 15 min |
| 14 | MP-14.md | LLM-based data classifier | 20 min |
| 15 | MP-15.md | Deterministic obligation mapper | 15 min |
| 16 | MP-16.md | Batched + chunked gap analyzer | 25 min |
| 17 | MP-17.md | Analysis pipeline orchestrator | 20 min |

### PHASE 4: API Layer (~2 hours)
| # | File | What It Builds | Time |
|---|------|----------------|------|
| 18 | MP-18.md | FastAPI core endpoints (analyze, status, health, history) | 25 min |
| 19 | MP-19.md | Generate, download, demo endpoints | 15 min |
| 20 | MP-20.md | 3 pre-computed demo scenarios | 20 min |

### PHASE 5: Document Generation (~2 hours)
| # | File | What It Builds | Time |
|---|------|----------------|------|
| 21 | MP-21.md | Jinja2 templates (5 document types) | 25 min |
| 22 | MP-22.md | Document generator + DOCX builder | 25 min |

### PHASE 6: Frontend (~4 hours)
| # | File | What It Builds | Time |
|---|------|----------------|------|
| 23 | MP-23.md | Next.js setup + API client (lib/api.ts) | 20 min |
| 24 | MP-24.md | Landing page + layout | 20 min |
| 25 | MP-25.md | Step 1: Upload wizard component | 25 min |
| 26 | MP-26.md | Step 2: Analysis viewer (score ring, gap cards) | 25 min |
| 27 | MP-27.md | Step 3: Document download center | 15 min |
| 28 | MP-28.md | Wizard orchestrator page (/analyze) | 25 min |
| 29 | MP-29.md | History sidebar + re-analyze flow | 15 min |

### PHASE 7: Testing + Deploy (~2 hours)
| # | File | What It Builds | Time |
|---|------|----------------|------|
| 30 | MP-30.md | Unit tests (fallback, mapper, sanitizer, cache, pipeline) | 25 min |
| 31 | MP-31.md | E2E tests + security (prompt injection) test | 20 min |
| 32 | MP-32.md | Dockerfile + Render + Vercel config + README | 20 min |

## Total Estimated Time: ~18–22 hours of coding agent execution

## Tips
- If a verification step fails, fix it before moving to the next MP
- MP-09 downloads the embedding model (~90MB) on first run — be patient
- MP-23 runs `npx create-next-app` which takes a few minutes
- You need a Gemini API key for MP-14/16/17 to use real LLM — fallback works without it
- Demo scenarios (MP-20) work with zero API keys — great for the demo video
