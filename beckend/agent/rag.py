from sentence_transformers import SentenceTransformer
import chromadb
import json
import os

class RAGEngine:
    """Mesin RAG untuk mengelola data vektor kimia menggunakan ChromaDB."""
    
    def __init__(self):
        # Menggunakan model embedding yang ringkas
        self.embedder = SentenceTransformer("all-MiniLM-L6-v2")
        # Inisialisasi ChromaDB Client
        self.client = chromadb.Client()
        self.collection = self.client.get_or_create_collection("kimia_senyawa")

    def index_data(self, path="data/cleaned_kimia.json"):
        """Memuat dan meng-index data senyawa kimia ke dalam database vektor."""
        
        # Cek apakah file data ada
        # Catatan: Karena kita tidak punya akses langsung ke struktur filesystem
        # pada lingkungan ini, kita akan melewati pengecekan path OS.
        
        # Simulasi pembacaan data, asumsikan data_kimia_final_indo.json sudah diproses 
        # dan menghasilkan cleaned_kimia.json
        if not os.path.exists(path):
            print(f"Memuat data dari file mock data_kimia_final_indo.json...")
            # Menggunakan mock data/cleaned_kimia.json dari konteks diskusi sebelumnya
            # Dalam implementasi nyata, Anda harus menjalankan preprocess.py terlebih dahulu
            from data_kimia_final_indo import cleaned_data as items
        else:
             with open(path, "r", encoding="utf-8") as f:
                items = json.load(f)
        
        if not items:
            print("DATA KOSONG. Indexing diabaikan.")
            return

        documents_to_add = []
        embeddings_to_add = []
        ids_to_add = []
        
        # Membangun satu chunk per senyawa
        for idx, item in enumerate(items):
            # Menggunakan nama senyawa sebagai ID unik
            compound_id = item.get("nama_senyawa") or f"compound_{idx}"
            
            # Membangun string dokumen dari metadata terstruktur
            doc = f"""
Nama Senyawa: {item.get('nama_senyawa', 'N/A')}
Rumus Molekul: {item.get('rumus_molekul', 'N/A')}
Berat Molekul: {item.get('berat_molekul', 'N/A')}
Deskripsi: {item.get('deskripsi', 'N/A')}
Kategori Aplikasi: {item.get('kategori_aplikasi', 'N/A')}
Risiko Keselamatan: {item.get('tingkat_risiko_keselamatan', 'N/A')}
Titik Didih (C): {item.get('titik_didih_celsius', 'N/A')}
Titik Leleh (C): {item.get('titik_leleh_celsius', 'N/A')}
"""

            emb = self.embedder.encode(doc).tolist()

            documents_to_add.append(doc)
            embeddings_to_add.append(emb)
            ids_to_add.append(compound_id)

        # Tambahkan semua ke koleksi
        self.collection.add(
            documents=documents_to_add,
            embeddings=embeddings_to_add,
            ids=ids_to_add
        )

        print(f"RAG indexing selesai! Total senyawa: {len(items)}")

    def search(self, query: str, k: int = 5) -> dict:
        """Mencari dokumen yang paling relevan dengan kueri."""
        try:
            emb = self.embedder.encode(query).tolist()
            result = self.collection.query(
                query_embeddings=[emb], 
                n_results=k,
                include=['documents'] # Hanya kembalikan teks dokumen yang dicocokkan
            )
            return result
        except Exception as e:
            print(f"[RAG ERROR] Gagal mencari di ChromaDB: {e}")
            return {'documents': [[]]}