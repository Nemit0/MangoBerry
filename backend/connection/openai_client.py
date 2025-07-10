import openai
import os

from . import load_env

openai_client = openai.OpenAI(
    api_key=os.getenv("OPENAI_API_KEY")
)

openai_async_client = openai.AsyncOpenAI(
    api_key=os.getenv("OPENAI_API_KEY")
)