FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p /app/uploads /app/vector_store /app/local_faiss_index /app/faiss_long_term_memory /app/hf_cache && \
    chmod -R 777 /app

ENV HF_HOME=/app/hf_cache
ENV HF_HUB_OFFLINE=0
ENV PORT=8000

EXPOSE 8000

CMD sh -c "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"
