# agent/services/rag_api.py
from fastapi import APIRouter
from pydantic import BaseModel
from ..rag import run_full_rag_pipeline # Panggil orkestrator

router = APIRouter()

class QueryRequest(BaseModel):
    query: str

@router.post("/answer")
def get_answer_endpoint(request: QueryRequest):
    """
    Endpoint yang menjalankan seluruh RAG pipeline (Retrieve dan Generate).
    """
    print(f"Received query for RAG: {request.query}")
    answer = run_full_rag_pipeline(request.query)
    
    if answer.startswith(("Gagal", "Error", "Saya tidak dapat")):
        return {"status": "error", "answer": answer}
    
    return {"status": "success", "answer": answer}