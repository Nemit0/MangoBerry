# Backend

## Overview
This directory serve as main backend for the project. It's built as an single python package, hence it contains __init__.py file. 

To run the backend, run the following command directly from the root of the project:
```bash
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

and the backend fastapi will start with hot reload enabled.

## Directory Structure

```
venvnemit@nemit-ThinkBook-14-G6-IRL:~/Documents/Projects/MangoBerry/backend$ tree -L 2
.
├── assets
│   └── logo.png
├── connection
│   ├── elasticdb.py
│   ├── load_env.py
│   ├── mongodb.py
│   ├── mysqldb.py
│   ├── openai_client.py
│   ├── __pycache__
│   └── s3.py
├── Dockerfile
├── __init__.py
├── main.py
├── __pycache__
│   ├── __init__.cpython-313.pyc
│   ├── keyword_extract.cpython-313.pyc
│   └── main.cpython-313.pyc
├── README.md
├── requirements.txt
├── routers
│   ├── elastic_router.py
│   ├── __init__.py
│   ├── keywordExt_router.py
│   ├── mongo_router.py
│   ├── mysql_router.py
│   ├── __pycache__
│   ├── review.py
│   ├── review_search.py
│   └── upload.py
├── schemas
│   ├── __init__.py
│   ├── photo.py
│   ├── __pycache__
│   ├── review.py
│   └── user.py
├── scripts
│   ├── blog_keywords.py
│   ├── elastic
│   └── mysql_extract_data.py
└── services
    ├── keyword_extract.py
    ├── __pycache__
    ├── s3.py
    └── utilities.py
```
All clients that interact directly with either the database or openai client are stored within the connections directory. Pydantic BaseModels are stored within schemas and the main routers are stored within routers. 
The service directory contains simple utilities and keyword extraction logics, along with uploading helpers. The scripts directory contains a single-use scripts that are used to either extract data or populate the database with initial data.