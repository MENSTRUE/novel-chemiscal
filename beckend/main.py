from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from agent.AgentOrchestrator import AgentOrchestrator
from agent.rag import RAGEngine

app = FastAPI()

# === CORS FIX 🔥 ===
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5500"],   # atau bisa ganti spesifik 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

agent = AgentOrchestrator()
rag = RAGEngine()

try:
    rag.index_data()
except Exception as e:
    print("Indexing error:", e)

class Request(BaseModel):
    query: str
    feedback: str | None = ""

@app.post("/ask")
def ask(req: Request):
    result = agent.process(req.query, req.feedback)
    return {"answer": result}
