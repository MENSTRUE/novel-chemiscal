# FILE: main.py (KODE LENGKAP DIPERBAIKI DENGAN SEMUA MODEL DI BAGIAN ATAS)

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any # Diperlukan untuk typing
from agent.AgentOrchestrator import AgentOrchestrator
from agent.rag import RAGEngine
import json
import os
import re 
import shutil # Diperlukan untuk Ingestion ulang/Save
from agent.embedding_service import DATA_FILE_PATH # Untuk menyimpan data ke JSON

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
    print("--- STARTUP EVENT: Memulai Indexing RAG ---")
    try:
        rag.index_data() 
        print("✅ RAG Engine initialized successfully via Startup Event")
    except Exception as e:
        print(f"❌ Indexing error in startup: {e}")

# ====================================================================
# 🔥 INPUT MODELS (SEMUA MODEL DI SINI UNTUK MENGHINDARI NameError) 🔥
# ====================================================================
class QueryRequest(BaseModel):
    query: str
    feedback: str | None = ""

class GenerateRequest(BaseModel):
    jenisProduk: str
    tujuan: str
    propertiTarget: Dict[str, str] 
    deskripsiKriteria: str | None = ""

class CombineRequest(BaseModel):
    compound_a: str
    compound_b: str

# 🔥 MODEL UNTUK REFINEMENT (ITERASI) 🔥
class RefineRequest(GenerateRequest):
    currentRecommendation: Dict[str, Any] 
    feedback: str 
# ====================================================================


# --- TEMPLATE SKEMA OUTPUT DETAIL GENERATE (Sesuai skema data Anda) ---
detailed_compound_template = {
    "nama_senyawa": "nama_senyawa", "rumus_molekul": "rumus_molekul", "berat_molekul": 0.0,
    "sinonim": "...", "deskripsi": "Deskripsi LLM yang merangkum properti, risiko, dan kecocokan.",
    "titik_didih_celsius": 0.0, "titik_leleh_celsius": 0.0, "densitas_gcm3": 0.0,
    "pernyataan_bahaya_ghs": "...", "kategori_aplikasi": "...",
    "sifat_fungsional": "...", "tingkat_risiko_keselamatan": "Rendah/Sedang/Tinggi",
    "bahaya_keselamatan": "...", "ketersediaan_bahan_baku": "Tersedia",
    "data_unsur_penyusun": [ {"nomor_atom": 0, "nama_unsur": "...", "simbol": "..."}],
    "skor_kecocokan": 0,
    "justifikasi_ringkas": "1-2 kalimat mengapa senyawa ini paling cocok dengan kriteria yang diminta."
}

# --- TEMPLATE SKEMA OUTPUT RINGKAS COMBINE ---
reaction_summary_template = {
    "reaktan_a": "nama_reaktan_a", "reaktan_b": "nama_reaktan_b", "jenis_reaksi": "Netralisasi/Redoks/Tidak Reaktif",
    "produk_utama": "Nama produk", "persamaan_stoikiometri": "Persamaan kimia yang seimbang.",
    "catatan_risiko": "Ringkasan risiko.", "deskripsi_ringkas": "Satu kalimat ringkas menjelaskan hasil."
}


# Helper untuk membuat prompt dari request
def create_compound_prompt(req: GenerateRequest, feedback: str = None, previous_result: Dict[str, Any] = None):
    kriteria_prompt = "\n".join([
        f"- {key}: {value}" for key, value in req.propertiTarget.items()
    ])
    if req.deskripsiKriteria:
        kriteria_prompt += f"\n- Kriteria Tambahan: {req.deskripsiKriteria}"

    prompt = f"""
    Anda adalah seorang Ahli Kimia. Tugas Anda adalah MEREKOMENDASIKAN HANYA SATU senyawa terbaik 
    dari database Anda yang paling memenuhi kriteria berikut. Anda harus mengisi **SEMUA FIELD** JSON di bawah ini.
    Jika data tidak tersedia, gunakan nilai NULL/0.0/'-'.

    Kriteria Pengguna Awal: {req.jenisProduk}, {req.tujuan}
    Properti Target Awal: {kriteria_prompt}
    
    """
    
    if previous_result and feedback:
        # Jika ini adalah iterasi (refinement)
        prompt += f"""
        ---
        REKOMENDASI SEBELUMNYA:
        Nama Senyawa: {previous_result.get("nama_senyawa", "N/A")}
        Justifikasi: {previous_result.get("justifikasi_ringkas", "N/A")}
        Skor Kecocokan: {previous_result.get("skor_kecocokan", "N/A")}%

        **PERINTAH PERBAIKAN BARU (FEEDBACK):** {feedback}
        
        Berdasarkan kriteria awal DAN perintah perbaikan di atas, carilah senyawa baru atau modifikasi justifikasi untuk senyawa yang lebih baik.
        """
    elif feedback:
        # Jika ada feedback langsung di query awal (kasus jarang)
        prompt += f"\n\n**Perintah Tambahan/Feedback:** {feedback}"
        
    prompt += f"""
    **KELUARAN WAJIB JSON MURNI**
    Berikan HANYA OBJEK JSON tunggal. Gunakan struktur JSON KETAT berikut:
    
    {json.dumps(detailed_compound_template, indent=2)}
    """
    return prompt


@app.get("/")
def read_root():
    return {
        "message": "ChemisTry API is running",
        "endpoints": {
            "/ask": "POST - Ask questions about compounds (RAG)",
            "/generate": "POST - Generate new compound recommendations (Agent)",
            "/refine": "POST - Refine compound recommendation (Agent Iterative)",
            "/combine": "POST - Predict reaction/properties of combined compounds (Agent)",
            "/save_compound": "POST - Save and index new compound data (Live Update)"
        }
    }

@app.post("/ask")
def ask(req: QueryRequest):
    """Endpoint untuk pertanyaan umum tentang senyawa kimia (RAG Pipeline)"""
    try:
        result = agent.process_query(req.query) 
        return {"answer": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# === ENDPOINT /generate (Panggilan Awal) ===
@app.post("/generate", response_model=Dict[str, Any]) 
def generate_compound(req: GenerateRequest):
    try:
        query = create_compound_prompt(req)
        result_json_str = agent.process_query(query, force_json=True) 
        
        # ... (Logika Error Handling dan Regex Extraction)
        if result_json_str.startswith("API_ERROR_429:"):
             raise HTTPException(status_code=429, detail=result_json_str)
        if result_json_str.startswith("API_ERROR:") or result_json_str.startswith("Terjadi kesalahan LLM"):
             raise HTTPException(status_code=503, detail=result_json_str)

        match = re.search(r'\{.*\}', result_json_str, re.DOTALL)
        if not match:
             raise json.JSONDecodeError("Tidak ditemukan blok JSON yang valid dalam respons LLM.", result_json_str, 0)
        
        json_extracted_str = match.group(0).strip()
        result_parsed = json.loads(json_extracted_str) 

        return {"success": True, "answer": result_parsed}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Server Error (/generate): {str(e)}")


# 🔥 ENDPOINT BARU: /refine (Iterasi Feedback) 🔥
@app.post("/refine", response_model=Dict[str, Any])
def refine_compound(req: RefineRequest):
    try:
        # Gunakan fungsi helper dengan parameter feedback dan previous_result
        query = create_compound_prompt(
            req, 
            feedback=req.feedback, 
            previous_result=req.currentRecommendation
        )
        
        # Kirim ke LLM untuk regenerasi
        result_json_str = agent.process_query(query, force_json=True) 

        # ... (Logika Error Handling dan Regex Extraction)
        if result_json_str.startswith("API_ERROR_429:"):
             raise HTTPException(status_code=429, detail=result_json_str)
        if result_json_str.startswith("API_ERROR:") or result_json_str.startswith("Terjadi kesalahan LLM"):
             raise HTTPException(status_code=503, detail=result_json_str)

        match = re.search(r'\{.*\}', result_json_str, re.DOTALL)
        if not match:
             raise json.JSONDecodeError("Tidak ditemukan blok JSON yang valid dalam respons LLM.", result_json_str, 0)
        
        json_extracted_str = match.group(0).strip()
        result_parsed = json.loads(json_extracted_str) 

        return {"success": True, "answer": result_parsed}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Server Error (/refine): {str(e)}")


# 🔥 ENDPOINT BARU: /save_compound (Life Update Database) 🔥
@app.post("/save_compound", response_model=Dict[str, str])
async def save_compound(compound_data: Dict[str, Any]):
    """
    Endpoint untuk menyimpan hasil JSON rekomendasi ke file database, lalu 
    memicu ingestion ulang (update live RAG).
    """
    try:
        # 1. Load data yang sudah ada
        with open(DATA_FILE_PATH, 'r', encoding='utf-8') as f:
            data_list = json.load(f)

        # 2. Tambahkan data senyawa baru
        compound_id = compound_data.get("nama_senyawa", "New_Compound_" + str(len(data_list)))
        compound_data["id"] = compound_id 
        data_list.append(compound_data)

        # 3. Tulis kembali seluruh data ke file JSON
        with open(DATA_FILE_PATH, 'w', encoding='utf-8') as f:
            json.dump(data_list, f, indent=2, ensure_ascii=False)
        
        # 4. 🔥 PICU INGENTION ULANG (Live Update RAG) 🔥
        print("API: Memicu re-indexing RAG untuk live update...")
        rag.index_data()
        
        return {"status": "success", "message": f"Senyawa '{compound_id}' berhasil disimpan ke database dan RAG diupdate secara live."}
        
    except Exception as e:
        # Jika terjadi error saat write file atau ingestion
        raise HTTPException(status_code=500, detail=f"Gagal menyimpan atau mengindeks ulang data: {str(e)}")


# === ENDPOINT /combine (FIX JSON) ===
@app.post("/combine", response_model=dict)
def combine_compounds(req: CombineRequest):
    """Endpoint untuk memprediksi hasil penggabungan dua senyawa."""
    result_json_str = "Error: LLM not called."
    json_extracted_str = ""
    
    try:
        # 1. & 2. Buat Query Reaksi dan Proses dengan agent
        query = f"""
        Anda adalah ahli kimia. Analisis interaksi antara senyawa: {req.compound_a} dan {req.compound_b}.
        
        Tentukan: jenis reaksi, produk utama, persamaan stoikiometri, dan risiko.

        **KELUARAN WAJIB JSON MURNI**
        Berikan HANYA respons JSON, tidak ada teks pengantar atau penutup.
        Struktur output JSON harus KETAT sesuai dengan skema:
        {json.dumps(reaction_summary_template, indent=2)}
        """
        
        result_json_str = agent.process_query(query, force_json=True)

        # 🔥 PERBAIKAN CHECK 1: Deteksi API Error (SEBELUM parsing JSON)
        if result_json_str.startswith("API_ERROR_429:"):
             raise HTTPException(
                 status_code=429, 
                 detail=result_json_str
             )
        if result_json_str.startswith("API_ERROR:") or result_json_str.startswith("Terjadi kesalahan LLM"):
             raise HTTPException(
                 status_code=503, 
                 detail=result_json_str
             )
        
        # 3. Ekstraksi JSON MURNI menggunakan Regex
        match = re.search(r'\{.*\}', result_json_str, re.DOTALL)
        
        if not match:
             raise json.JSONDecodeError("Tidak ditemukan blok JSON yang valid dalam respons LLM.", result_json_str, 0)
        
        json_extracted_str = match.group(0).strip()
        
        # 4. Parsing dan kembalikan JSON
        result_parsed = json.loads(json_extracted_str) 

        return {
            "success": True,
            "result": result_parsed 
        }
        
    except HTTPException:
        raise
        
    except json.JSONDecodeError as e:
        # Logging error 500 jika parsing (setelah regex) masih gagal
        raw_start = result_json_str.strip()[:100] if result_json_str.strip() else "[Empty Response]"
        extracted_start = json_extracted_str[:100] if 'json_extracted_str' in locals() and json_extracted_str else "[Extraction Failed]"
        
        raise HTTPException(
            status_code=500, 
            detail=f"AI Response Invalid JSON (Endpoint /combine): {e}. LLM gagal mematuhi format JSON. Output Mentah: '{raw_start}...' | Diekstrak: '{extracted_start}'"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

@app.get("/health")
def health_check():
    # Cek status RAG
    return {"status": "healthy", "rag_initialized": rag.is_indexed}