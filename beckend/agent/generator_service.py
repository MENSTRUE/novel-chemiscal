# agent/generator_service.py
from langchain_core.documents import Document
from .llm import get_llm_response

SYSTEM_PROMPT = (
    "Anda adalah asisten AI yang ahli dalam Kimia. "
    "Gunakan hanya konteks yang diberikan untuk menjawab pertanyaan. "
    "Jika jawaban tidak ditemukan dalam konteks, katakan 'Saya tidak dapat menemukan jawaban yang relevan dari dokumen yang tersedia.' "
    "Pastikan jawaban Anda akurat dan ringkas."
)

def generate_answer(user_query: str, retrieved_documents: list[Document]) -> str:
    """
    Menggabungkan dokumen yang diambil dengan query user dan menghasilkan jawaban.
    """
    if not retrieved_documents:
        return "Saya tidak dapat menemukan konteks yang relevan untuk pertanyaan ini."
        
    # Gabungkan isi dokumen menjadi satu string konteks
    context = "\n---\n".join([doc.page_content for doc in retrieved_documents])
    
    # Buat final prompt
    prompt = (
        f"{SYSTEM_PROMPT}\n\n"
        f"KONTEKS:\n{context}\n\n"
        f"PERTANYAAN PENGGUNA: {user_query}"
    )

    # Panggil LLM (Gemini)
    answer = get_llm_response(prompt)
    return answer