import asyncio
import os
from typing import List, Sequence

from dotenv import load_dotenv
from tqdm import tqdm
from tqdm.asyncio import tqdm_asyncio

from openai import OpenAI, AsyncOpenAI

# ─── ENV / CLIENTS ─────────────────────────────────────────────────────────────
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

sync_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
async_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

MODEL          = "text-embedding-3-small"
BATCH_SIZE     = 512
PARALLEL_REQS  = 3

# ─── 1.  SYNC HELPERS ──────────────────────────────────────────────────────────
def embed_small(texts: Sequence[str]) -> List[List[float]]:
    """Embed ≤512 texts synchronously."""
    resp = sync_client.embeddings.create(model=MODEL, input=list(texts))
    return [d.embedding for d in resp.data]


def embed_large(texts: Sequence[str]) -> List[List[float]]:
    """Synchronous batching with classic tqdm progress bar."""
    vectors: List[List[float]] = []
    for start in tqdm(range(0, len(texts), BATCH_SIZE), desc="Embedding (sync)"):
        chunk = texts[start : start + BATCH_SIZE]
        vectors.extend(embed_small(chunk))
    return vectors


# ─── 2.  ASYNC HELPERS ─────────────────────────────────────────────────────────
async def _embed_chunk_async(chunk: Sequence[str]) -> List[List[float]]:
    """Real async call (uses AsyncOpenAI)."""
    resp = await async_client.embeddings.create(model=MODEL, input=list(chunk))
    return [d.embedding for d in resp.data]


async def embed_large_async(
    texts: Sequence[str], parallel_reqs: int = PARALLEL_REQS
) -> List[List[float]]:
    """
    Concurrent embedding with a live tqdm progress bar.
    Order of `texts` is preserved in the returned list.
    """
    # Split corpus into ≤512-item chunks
    chunks = [texts[i : i + BATCH_SIZE] for i in range(0, len(texts), BATCH_SIZE)]

    sem = asyncio.Semaphore(parallel_reqs)

    async def worker(idx: int, chunk: Sequence[str]):
        """Embed one chunk, respecting the concurrency semaphore."""
        async with sem:
            vecs = await _embed_chunk_async(chunk)
        return idx, vecs

    # Create tasks carrying their original index
    tasks = [worker(i, chunk) for i, chunk in enumerate(chunks)]

    # tqdm_asyncio.gather == asyncio.gather + progress bar
    gathered: List[tuple[int, List[List[float]]]] = await tqdm_asyncio.gather(
        *tasks, total=len(tasks), desc="Embedding (async)"
    )

    # Restore original order and flatten
    gathered.sort(key=lambda x: x[0])                 # sort by chunk index
    final_vectors = [vec for _, page in gathered for vec in page]
    return final_vectors


# ─── 3.  DEMO / CLI ENTRY POINT ────────────────────────────────────────────────
if __name__ == "__main__":
    docs = [
        "Seoul is the capital of South Korea.",
        "Python is a great programming language for machine learning.",
        "OpenAI provides state-of-the-art language models.",
    ] * 10  # pretend the corpus is huge

    # Option A — synchronous
    # vectors = embed_large(docs)

    # Option B — asynchronous turbo
    vectors = asyncio.run(embed_large_async(docs))

    print(f"\nEmbedded {len(vectors):,} texts. First vector dim: {len(vectors[0])}")
    print(vectors[0])
    # print(json.dumps(vectors, indent=2, ensure_ascii=False))

    # Non-Async Example
    
    vectors = embed_small(docs)
    print(f"\nEmbedded {len(vectors):,} texts. First vector dim: {len(vectors[0])}")
    print(vectors[0])