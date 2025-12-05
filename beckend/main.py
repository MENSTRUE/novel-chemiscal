# FILE: main.py

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional # Tambahkan List & Optional untuk type hinting
from agent.AgentOrchestrator import AgentOrchestrator
from agent.rag import RAGEngine
import json
import os

app = FastAPI(title="ChemisTry Agentic RAG API")

# Definisikan agent dan rag di global scope.
rag = RAGEngine()
agent = AgentOrchestrator()

# === CORS FIX 🔥 ===
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    """
    [FIX KRITIS] Menjamin state RAG stabil. 
    Indexing (rag.index_data()) dipanggil HANYA sekali di sini sebelum worker menerima request.
    """
    print("--- STARTUP EVENT: Memulai Indexing RAG ---")
    try:
        rag.index_data() 
        print("✅ RAG Engine initialized successfully via Startup Event")
    except Exception as e:
        print(f"❌ Indexing error in startup: {e}")

# --- INPUT MODELS ---
class QueryRequest(BaseModel):
    query: str
    feedback: str | None = ""

class GenerateRequest(BaseModel):
    # FIELD-FIELD INI WAJIB ADA (Penyebab error 422 jika body /combine dikirim ke sini)
    jenisProduk: str
    tujuan: str
    propertiTarget: dict
    deskripsiKriteria: str | None = ""

class CombineRequest(BaseModel):
    compound_a: str
    compound_b: str


# --- TEMPLATE SKEMA OUTPUT DETAIL GENERATE (Untuk Promp LLM) ---
# Skema ini meniru data mentah Anda + field analisis tambahan
detailed_compound_template = {
    "nama_senyawa": "nama_senyawa",
    "rumus_molekul": "rumus_molekul",
    "berat_molekul": 0.0,
    "sinonim": "...",
    "deskripsi": "Deskripsi LLM yang merangkum properti, risiko, dan kecocokan.",
    "titik_didih_celsius": 0.0,
    "titik_leleh_celsius": 0.0,
    "densitas_gcm3": 0.0,
    "pernyataan_bahaya_ghs": "...",
    "kategori_aplikasi": "...",
    "sifat_fungsional": "...",
    "tingkat_risiko_keselamatan": "Rendah/Sedang/Tinggi",
    "bahaya_keselamatan": "...",
    "ketersediaan_bahan_baku": "Tersedia",
    "data_unsur_penyusun": [
      {
        "nomor_atom": 0,
        "nama_unsur": "...",
        # ... field unsur lainnya
        "simbol": "..."
      }
    ],
    "skor_kecocokan": 0,
    "justifikasi_ringkas": "1-2 kalimat mengapa senyawa ini paling cocok dengan kriteria yang diminta."
}

# --- TEMPLATE SKEMA OUTPUT RINGKAS COMBINE ---
reaction_summary_template = {
    "reaktan_a": "nama_reaktan_a",
    "reaktan_b": "nama_reaktan_b",
    "jenis_reaksi": "Netralisasi/Redoks/Tidak Reaktif",
    "produk_utama": "Nama produk",
    "persamaan_stoikiometri": "Persamaan kimia yang seimbang.",
    "catatan_risiko": "Ringkasan risiko.",
    "deskripsi_ringkas": "Satu kalimat ringkas menjelaskan hasil."
}


@app.get("/")
def read_root():
    return {
        "message": "ChemisTry API is running",
        "endpoints": {
            "/ask": "POST - Ask questions about compounds (RAG)",
            "/generate": "POST - Generate new compound recommendations (Agent)",
            "/combine": "POST - Predict reaction/properties of combined compounds (Agent)" 
        }
    }

@app.post("/ask")
def ask(req: QueryRequest):
    """
    Endpoint untuk pertanyaan umum tentang senyawa kimia (RAG Pipeline)
    """
    try:
        # AgentOrchestrator akan mengarahkan ke RAG karena query faktual
        # Dipanggil tanpa force_json
        result = agent.process_query(req.query) 
        return {"answer": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# === ENDPOINT /generate (FIX JSON DETAIL) ===
@app.post("/generate", response_model=dict) 
def generate_compound(req: GenerateRequest):
    """
    Endpoint untuk menghasilkan rekomendasi senyawa baru dengan AI agent.
    Memaksa output JSON detail sesuai struktur database.
    """
    try:
        # 1. Buat Query Rinci
        kriteria_prompt = "\n".join([
            f"- {key}: {value}" for key, value in req.propertiTarget.items()
        ])
        if req.deskripsiKriteria:
            kriteria_prompt += f"\n- Kriteria Tambahan: {req.deskripsiKriteria}"

        # 2. Tambahkan INSTRUKSI LENGKAP JSON
        query = f"""
        Anda adalah seorang Ahli Kimia. Tugas Anda adalah MEREKOMENDASIKAN HANYA SATU senyawa terbaik 
        dari database Anda yang paling memenuhi kriteria berikut. Anda harus mengisi **SEMUA FIELD** JSON di bawah ini 
        dengan data mentah yang akurat, lalu tambahkan analisis skor dan justifikasi.
        
        Kriteria Pengguna: {req.jenisProduk}, {req.tujuan}, {kriteria_prompt}

        **KELUARAN WAJIB JSON MURNI**
        Berikan HANYA OBJEK JSON tunggal. Gunakan struktur JSON KETAT berikut:
        
        {json.dumps(detailed_compound_template, indent=2)}
        """

        result_json_str = "Error: LLM not called." 
        # 3. Proses dengan agent, memaksa output JSON
        # Orchestrator akan merutekan ke Gemini Pro dengan JSON mode
        result_json_str = agent.process_query(query, force_json=True) 
        
        # 4. Parsing JSON yang aman: Hapus whitespace/newline di awal/akhir
        result_parsed = json.loads(result_json_str.strip()) 

        return {
            "success": True,
            "answer": result_parsed
        }
        
    except json.JSONDecodeError as e:
        # Logging error yang lebih informatif
        raw_start = result_json_str.strip()[:100] if result_json_str.strip() else "[Empty Response]"
        raise HTTPException(
            status_code=500, 
            detail=f"AI Response Invalid JSON (Endpoint /generate): {e}. Output Mentah dimulai dengan: '{raw_start}...' (LLM gagal mematuhi format JSON KETAT)."
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")


# === ENDPOINT /combine (FIX JSON) ===
@app.post("/combine", response_model=dict)
def combine_compounds(req: CombineRequest):
    """
    Endpoint untuk memprediksi hasil penggabungan dua senyawa.
    Memaksa output dalam format JSON ringkas untuk ringkasan reaksi.
    """
    # 1. Buat Query Reaksi dengan instruksi JSON yang DITINGKATKAN
    query = f"""
    Anda adalah ahli kimia. Analisis interaksi antara senyawa: {req.compound_a} dan {req.compound_b}.
    
    Tentukan: jenis reaksi, produk utama, persamaan stoikiometri, dan risiko.

    **KELUARAN WAJIB JSON MURNI**
    Berikan HANYA respons JSON, tidak ada teks pengantar atau penutup.
    Struktur output JSON harus KETAT sesuai dengan skema:
    {json.dumps(reaction_summary_template, indent=2)}
    """
    
    result_json_str = "Error: LLM not called."
    try:
        # 2. Proses dengan agent, memaksa output JSON
        result_json_str = agent.process_query(query, force_json=True)

        # 3. Parsing dan kembalikan JSON (Gunakan .strip() untuk membersihkan)
        result_parsed = json.loads(result_json_str.strip()) 

        return {
            "success": True,
            "result": result_parsed 
        }
        
    except json.JSONDecodeError as e:
        raw_start = result_json_str.strip()[:100] if result_json_str.strip() else "[Empty Response]"
        raise HTTPException(
            status_code=500, 
            detail=f"AI Response Invalid JSON (Endpoint /combine): {e}. Output Mentah dimulai dengan: '{raw_start}...' (LLM gagal mematuhi format JSON)."
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
def health_check():
    # Cek status RAG
    return {"status": "healthy", "rag_initialized": rag.is_indexed}