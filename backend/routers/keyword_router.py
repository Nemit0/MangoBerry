from fastapi import APIRouter, Query
from collections import Counter
from konlpy.tag import Okt
from dotenv import load_dotenv
from elasticsearch import Elasticsearch
import sqlite3
import re
import os

load_dotenv()
ES_ID = os.getenv("API_KEY_ID")
ES_KEY = os.getenv("API_KEY")


es = Elasticsearch(
    "https://2ae07f7bf36d47cc9da14549c264281b.us-central1.gcp.cloud.es.io:443",
    api_key=(ES_ID, ES_KEY)
)

router = APIRouter()
okt = Okt()


# def clean_text(text):
#     if not text:
#         return ""
#     text = re.sub('<[^<]+?>', '', text)
#     text = re.sub('[^가-힣a-zA-Z0-9 ]', ' ', text)
#     text = re.sub('\s+', ' ', text)
#     return text.strip()

@router.get("/keywords")
def keyword_extraction(limit: int = Query(1000), topn: int = Query(50)):
    print("✅✅✅ KEYWORDS 라우터 실행됨! ✅✅✅")
    conn = sqlite3.connect(r"C:\Users\hi\PycharmProjects\MangoBerryProject\MangoBerry\backend\routers\clean_copy.sqlite")
    cursor = conn.cursor()

    cursor.execute(f"SELECT text FROM blog_texts LIMIT {limit};")
    rows = cursor.fetchall()
    all_text = " ".join([row[0] for row in rows if row[0]])
    nouns = okt.nouns(all_text)
    nouns = [n for n in nouns if len(n) > 1 and not n.isdigit()]
    counter = Counter(nouns)
    conn.close()

    print("상위 5개:", counter.most_common(5))
    return [{"word": word, "count": cnt} for word, cnt in counter.most_common(topn)]
