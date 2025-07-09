import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Add the project root to sys.path
sys.path.append(str(Path(__file__).resolve().parents[1]))

from MangoBerry.backend.env_variables import ES_HOST, ES_USER, ES_PASS

print("Current working directory:", os.getcwd())

from elasticsearch import Elasticsearch

es = Elasticsearch(ES_HOST, basic_auth=(ES_USER, ES_PASS))

res = es.search(index="user_review", query={"match_all": {}})
for hit in res["hits"]["hits"]:
    print(hit["_id"], hit["_source"])