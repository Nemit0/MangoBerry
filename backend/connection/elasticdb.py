from elasticsearch import Elasticsearch
import os

import backend.connection.load_env

es_client = Elasticsearch(
    hosts=os.getenv("ES_HOST"),
    basic_auth=(os.getenv("ES_USER"), os.getenv("ES_PASS"))
)