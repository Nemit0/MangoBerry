FROM ubuntu:24.04
ENV PYTHON_GIL=0

# ── 1. base OS deps ────────────────────────────────────────────────────────────
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        software-properties-common \
        build-essential wget ca-certificates \
        libssl-dev zlib1g-dev libbz2-dev libreadline-dev \
        libsqlite3-dev libffi-dev xz-utils curl && \
    rm -rf /var/lib/apt/lists/*

# ── 2. regular & free‑threaded 3.13 from deadsnakes NIGHTLY ────────────────────
RUN add-apt-repository -y ppa:deadsnakes/ppa         && \
    add-apt-repository -y ppa:deadsnakes/nightly     && \
    apt-get update                                   && \
    apt-get install -y --no-install-recommends \
        python3.13 python3.13-venv python3.13-dev \
        python3.13-nogil && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# ── 3. bootstrap pip ──────────────────────────────────────────────────────────
RUN python3.13t -m ensurepip --upgrade || true

# ── 4. project deps ───────────────────────────────────────────────────────────
WORKDIR /app
COPY backend/requirements.txt /app/backend/requirements.txt
RUN python3.13t -m pip install --no-cache-dir -r /app/backend/requirements.txt
COPY . /app

EXPOSE 8000
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
