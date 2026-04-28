# Backend Dockerfile for ServerKit
FROM ubuntu:24.04

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    FLASK_ENV=production \
    PORT=5000 \
    DEBIAN_FRONTEND=noninteractive

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-dev \
    python3-venv \
    gcc \
    libpq-dev \
    libffi-dev \
    libssl-dev \
    libevent-dev \
    clamav \
    clamav-daemon \
    clamav-freshclam \
    curl \
    procps \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Create directories for ServerKit
RUN mkdir -p /etc/serverkit /var/serverkit/apps /app/logs /var/quarantine /app/instance /var/backups/serverkit

# Copy requirements first for caching
COPY requirements.txt .

# Install Python dependencies
# Note: On Ubuntu 24.04, we need to use --break-system-packages or a venv for global pip
RUN pip3 install --no-cache-dir --break-system-packages -r requirements.txt \
    && pip3 install --no-cache-dir --break-system-packages gunicorn gevent gevent-websocket

# Copy application code
COPY . .

# Create non-root user and set permissions
RUN useradd --create-home appuser \
    && chown -R appuser:appuser /app \
    && chown -R appuser:appuser /app/instance \
    && chown -R appuser:appuser /etc/serverkit \
    && chown -R appuser:appuser /var/quarantine \
    && chown -R appuser:appuser /var/backups/serverkit

USER appuser

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5000/api/v1/system/health || exit 1

# Run with gunicorn + gevent for WebSocket support
CMD ["gunicorn", "-k", "geventwebsocket.gunicorn.workers.GeventWebSocketWorker", \
     "-w", "1", "-b", "0.0.0.0:5000", "--timeout", "120", \
     "--access-logfile", "-", "--error-logfile", "-", \
     "run:app"]
