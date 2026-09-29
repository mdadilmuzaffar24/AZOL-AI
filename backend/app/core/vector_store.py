import os
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_core.documents import Document

# 1. Define the absolute path to the locally bundled model (Air-Gapped Setup)
# This ensures the system always finds the local model folder no matter where the script is run from.
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
LOCAL_MODEL_PATH = os.path.join(BASE_DIR, "models", "all-MiniLM-L6-v2")

# 2. Initialize embeddings using the local directory instead of the HuggingFace Hub
embeddings = HuggingFaceEmbeddings(model_name=LOCAL_MODEL_PATH)

# 3. Absolute Path for the Vector Database (THE FIX)
# This strictly anchors the FAISS database to your project root.
FAISS_INDEX_PATH = os.path.join(BASE_DIR, "faiss_long_term_memory")

def get_vector_store():
    """Loads existing FAISS index or creates a new empty one."""
    if os.path.exists(FAISS_INDEX_PATH):
        # Allow dangerous deserialization is required for local FAISS loading in LangChain
        return FAISS.load_local(FAISS_INDEX_PATH, embeddings, allow_dangerous_deserialization=True)
    else:
        # Create an empty index with a baseline system document
        empty_doc = Document(
            page_content="System memory initialized.", 
            metadata={"source": "system_init"}
        )
        vector_store = FAISS.from_documents([empty_doc], embeddings)
        vector_store.save_local(FAISS_INDEX_PATH)
        return vector_store

def save_to_memory(text: str, metadata: dict = None):
    """Embeds and saves new information to the permanent FAISS index."""
    vector_store = get_vector_store()
    doc = Document(page_content=text, metadata=metadata or {})
    vector_store.add_documents([doc])
    vector_store.save_local(FAISS_INDEX_PATH)
    return True

def search_memory(query: str, k: int = 3):
    """Searches the FAISS index for the most contextually relevant memories."""
    vector_store = get_vector_store()
    results = vector_store.similarity_search(query, k=k)
    return [res.page_content for res in results]