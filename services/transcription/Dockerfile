FROM python:3.11-slim

RUN apt-get update && apt-get install -y \
    ffmpeg \
    libsndfile1 \
    libgomp1 \
    curl \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .

# Install Python deps (torch CPU-only for Railway, smaller image)
RUN pip install --no-cache-dir torch torchaudio --index-url https://download.pytorch.org/whl/cpu
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Decode YouTube cookies from environment variable if present (for age-restricted videos)
RUN if [ -n "$YOUTUBE_COOKIES_BASE64" ]; then \
    echo "$YOUTUBE_COOKIES_BASE64" | base64 -d > youtube_cookies.txt && \
    echo "YouTube cookies configured"; \
    fi

# Pre-download models at build time to avoid cold-start downloads
RUN python -c "import demucs.pretrained; demucs.pretrained.get_model('htdemucs')" || echo "Demucs pre-download skipped"
RUN python -c "from basic_pitch.inference import predict; print('basic-pitch ready')" || echo "basic-pitch pre-load skipped"

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
