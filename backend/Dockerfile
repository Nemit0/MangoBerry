FROM python:3.11-slim-bookworm
WORKDIR /app
COPY ./* .

RUN pip install --no-cache-dir -r requirements.txt

ARG ipaddress=0.0.0.0

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "${ipaddress}", "--port", "8000", "--reload"]