import asyncio

from typing import List, Sequence

from ..connection.openai_client import openai_client, openai_async_client

MODEL = "text-embedding-3-small"
BATCH_SIZE = 512
PARALLEL_REQS = 3

def embed_small(texts: Sequence[str]) -> List[List[float]]:
    resp = openai_client.embeddings.create(model=MODEL, input=list(texts))
    return [d.embedding for d in resp.data]

def embed_large(texts: Sequence[str]) -> List[List[float]]:
    vectors: List[List[float]] = []
    for start in range(0, len(texts), BATCH_SIZE):
        chunk = texts[start : start + BATCH_SIZE]
        vectors.extend(embed_small(chunk))
    return vectors

async def _embed_chunk_async(chunk: Sequence[str]) -> List[List[float]]:
    resp = await openai_async_client.embeddings.create(model=MODEL, input=list(chunk))
    return [d.embedding for d in resp.data]

async def embed_large_async(
    texts: Sequence[str], parallel_reqs: int = PARALLEL_REQS
) -> List[List[float]]:
    chunks = [texts[i : i + BATCH_SIZE] for i in range(0, len(texts), BATCH_SIZE)]
    sem = asyncio.Semaphore(parallel_reqs)

    async def worker(idx: int, chunk: Sequence[str]):
        async with sem:
            return idx, await _embed_chunk_async(chunk)

    tasks = [worker(i, chunk) for i, chunk in enumerate(chunks)]
    results = await asyncio.gather(*tasks)
    
    vectors = [None] * len(texts)
    for idx, vecs in results:
        vectors[idx * BATCH_SIZE : (idx + 1) * BATCH_SIZE] = vecs

    return vectors