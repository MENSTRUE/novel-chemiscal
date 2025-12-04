from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from agent.AgentOrchestrator import AgentOrchestrator
from agent.rag import RAGEngine
import json
import os

app = FastAPI()

# === CORS FIX 🔥 ===
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

agent = AgentOrchestrator()
rag = RAGEngine()

# Initialize RAG with data
# try:
#     rag.index_data()
#     print("RAG Engine initialized successfully")
# except Exception as e:
#     print(f"Indexing error: {e}")

class QueryRequest(BaseModel):
    query: str
    feedback: str | None = ""

class GenerateRequest(BaseModel):
    jenisProduk: str
    tujuan: str
    propertiTarget: dict
    deskripsiKriteria: str | None = ""

@app.get("/")
def read_root():
    return {
        "message": "ChemisTry API is running",
        "endpoints": {
            "/ask": "POST - Ask questions about compounds",
            "/generate": "POST - Generate new compound recommendations"
        }
    }

@app.post("/ask")
def ask(req: QueryRequest):
    """
    Endpoint untuk pertanyaan umum tentang senyawa kimia
    """
    try:
        result = agent.process_query(req.query)
        return {"answer": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate")
def generate_compound(req: GenerateRequest):
    """
    Endpoint untuk generate senyawa baru dengan AI agent
    Agent akan:
    1. Cek data lokal dulu (RAG)
    2. Jika tidak cocok, gunakan Gemini API
    3. Return hasil ke frontend
    """
    try:
        # Build query from request
        query = f"""
Saya membutuhkan rekomendasi senyawa kimia dengan kriteria berikut:

Jenis Produk: {req.jenisProduk}
Tujuan/Fungsi: {req.tujuan}

Target Properti:
"""
        # Add properties
        for key, value in req.propertiTarget.items():
            if value:  # Only add non-empty properties
                query += f"- {key}: {value}\n"
        
        # Add additional criteria
        if req.deskripsiKriteria:
            query += f"\nKriteria Tambahan:\n{req.deskripsiKriteria}"
        
        query += "\n\nBerikan rekomendasi senyawa yang sesuai dengan kriteria di atas."
        
        # Process with agent (will check RAG first, then Gemini if needed)
        result = agent.process_query(query)
        
        return {
            "success": True,
            "answer": result,
            "query": query
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
def health_check():
    return {"status": "healthy", "rag_initialized": rag is not None}