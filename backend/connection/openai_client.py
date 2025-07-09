import openai
import os

import backend.connection.load_env

openai_client = openai.OpenAI(
    api_key=os.getenv("OPENAI_API_KEY")
)