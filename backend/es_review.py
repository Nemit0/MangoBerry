from elasticsearch import Elasticsearch
import os
from dotenv import load_dotenv


load_dotenv()
es = Elasticsearch(os.getenv("ES_HOST"),
    basic_auth=(os.getenv("ES_USER"), os.getenv("ES_PASS"))) 

# res = es.get(index="user_review", id=1)
# print(res["_source"])

res = es.search(index="user_review", query={"match_all": {}})
for hit in res["hits"]["hits"]:
    print(hit["_id"], hit["_source"])