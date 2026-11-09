FROM python:3.12-slim

# Install system dependencies including ffmpeg
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements and install
COPY "voice Translation/voice Translation/requirements.txt" .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source code
COPY "voice Translation/voice Translation/" .

ENV PORT=5000
EXPOSE 5000

# Run with gunicorn in production
CMD ["gunicorn", "app:app", "--bind", "0.0.0.0:5000", "--workers", "1", "--threads", "8", "--timeout", "120"]

