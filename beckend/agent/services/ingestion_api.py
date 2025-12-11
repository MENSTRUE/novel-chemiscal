# agent/services/ingestion_api.py
from fastapi import APIRouter
from pydantic import BaseModel
from ...agent.embedding_service import run_ingestion # Import fungsi dari embedding_service.py

router = APIRouter()

# Skema response untuk konsumsi tim FE
class IngestionResponse(BaseModel):
    status: str
    message: str

@router.post("/ingest", response_model=IngestionResponse)
def start_ingestion():
    """
    Endpoint untuk memicu proses Data Ingestion secara asinkron (memuat data JSON ke Vector DB).
    
    Tim FE memanggil endpoint ini sekali untuk menyiapkan data.
    """
    print("API: Starting data ingestion process...")
    
    # Memanggil fungsi inti ingestion yang ada di embedding_service.py
    result_message = run_ingestion()
    
    # Cek apakah ada pesan error yang dikembalikan
    if result_message.startswith("Error"):
        # Mengembalikan status error jika proses gagal
        return IngestionResponse(status="error", message=result_message)
    else:
        # Mengembalikan status success jika berhasil
        return IngestionResponse(status="success", message=result_message)