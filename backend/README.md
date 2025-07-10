# Backend

## Overview
This directory serve as main backend for the project. It's built as an single python package, hence it contains __init__.py file. 

To run the backend, first set up virtual environment and required libraries by running:
```bash
# Windows
python -m venv venv & venv\Scripts\activate
# Linux/MacOS
python3 -m venv venv && source venv/bin/activate

# After creating and activating the virtual environment, install the required libraries:
pip install -r ./backend/requirements.txt
```
afterwards, run the following command directly from the root of the project:
```bash
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

and the backend fastapi will start with hot reload enabled.

## Directory Structure

```
.
├── assets
│   └── logo.png
├── connection
│   ├── elasticdb.py
│   ├── load_env.py
│   ├── mongodb.py
│   ├── mysqldb.py
│   ├── openai_client.py
│   └── s3.py
├── Dockerfile
├── __init__.py
├── main.py
├── README.md
├── requirements.txt
├── routers
│   ├── elastic_router.py
│   ├── __init__.py
│   ├── keywordExt_router.py
│   ├── mongo_router.py
│   ├── mysql_router.py
│   ├── review.py
│   ├── review_search.py
│   └── upload.py
├── schemas
│   ├── __init__.py
│   ├── photo.py
│   ├── review.py
│   └── user.py
├── scripts
│   ├── blog_keywords.py
│   ├── elastic
│   └── mysql_extract_data.py
└── services
    ├── keyword_extract.py
    ├── s3.py
    └── utilities.py
```
All python files are seperated into directories based on their functionality.
 - Connections to MySQL, MongoDB, ElasticSearch, OpenAI, and S3 are stored in their respective files inside connections directory.
 - Pydantic BaseModels are stored within schemas and the main routers are stored within routers. 
 - The service directory contains simple utilities and keyword extraction logics, along with uploading helpers. 
 - The scripts directory contains a single-use scripts that are used to either extract data or populate the database with initial data.

The main script is executed with uvicorn, where it contains fastapi app instance. The main.py file is the entry point of the backend.

## Running a single script inside scripts directory

Since the backend is a single python package, you can run a script inside scripts directory by running the following command from the root of the project:
```bash
python -m backend.scripts.<script_name>
```

for instance, to run the `test.py` script, you can run:
```bash
python -m backend.scripts.test
```