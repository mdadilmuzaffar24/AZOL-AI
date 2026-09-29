import os
import logging
from langchain_groq import ChatGroq
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_openai import ChatOpenAI

logger = logging.getLogger(__name__)

def get_llm_client(temperature: float = 0.1):
    """
    Initializes a production-grade, multi-provider stacked LLM client with 
    centralized Langfuse observability and token telemetry.
    Cascades smoothly across Groq, Google Gemini, and OpenRouter to prevent token depletion.
    """
    callbacks = []
    
    # 1. Initialize Langfuse Observability Handler if API keys are set in environment
    langfuse_public_key = os.getenv("LANGFUSE_PUBLIC_KEY")
    langfuse_secret_key = os.getenv("LANGFUSE_SECRET_KEY")
    langfuse_host = os.getenv("LANGFUSE_HOST", "https://cloud.langfuse.com")

    if langfuse_public_key and langfuse_secret_key:
        try:
            from langfuse.callback import CallbackHandler
            langfuse_handler = CallbackHandler(
                public_key=langfuse_public_key,
                secret_key=langfuse_secret_key,
                host=langfuse_host
            )
            callbacks.append(langfuse_handler)
            logger.info("Langfuse observability handler initialized successfully.")
        except Exception as e:
            logger.warning(f"Could not initialize Langfuse callback handler: {e}")

    # Tier 1: Primary Engine (Groq - Ultra Fast, Strict Limits)
    tier1_groq = ChatGroq(
        groq_api_key=os.getenv("GROQ_API_KEY"),
        model_name="openai/gpt-oss-120b", 
        temperature=temperature,
        max_retries=1,
        timeout=10.0,
        callbacks=callbacks if callbacks else None
    )
    
    # Tier 2: Secondary Engine (Google Gemini - Deep Context Window)
    tier2_gemini = ChatGoogleGenerativeAI(
        google_api_key=os.getenv("GEMINI_API_KEY"),
        model="gemini-1.5-flash",
        temperature=temperature,
        max_retries=1,
        timeout=12.0,
        callbacks=callbacks if callbacks else None
    )
    
    # Tier 3: Tertiary Engine (OpenRouter - Zero Cost Fallback)
    tier3_backup = ChatOpenAI(
        api_key=os.getenv("OPENROUTER_API_KEY"),
        base_url="https://openrouter.ai/api/v1",
        model="meta-llama/llama-3.3-70b-instruct:free",
        temperature=temperature,
        max_retries=2,
        timeout=15.0,
        callbacks=callbacks if callbacks else None
    )
    
    # The Unlimited Token Chain with Traced Fallback Routing
    resilient_client = tier1_groq.with_fallbacks(
        [tier2_gemini, tier3_backup],
        exceptions_to_handle=(Exception,)
    )
    
    return resilient_client