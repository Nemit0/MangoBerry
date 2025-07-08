# MangoBerry

IBM x RedHat 1기 4조 프로젝트 리포지토리.

## 프로젝트 설명


## 프로젝트 구조

```MangoBerry
.
├── backend
│   ├── blog_keywords.py
│   ├── connection
│   ├── Dockerfile
│   ├── elastic
│   ├── env_variables.py
│   ├── final_logo.png
│   ├── __init__.py
│   ├── keyword_extract.py
│   ├── main.py
│   ├── mysql
│   ├── README.md
│   ├── requirements.txt
│   ├── routers
│   ├── schemas
│   └── services
├── docker-compose.yaml
├── frontend
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── node_modules
│   ├── package.json
│   ├── package-lock.json
│   ├── public
│   ├── README.md
│   └── src
├── README.md
└── run.sh


frontend는 하나의 react 프로젝트로 구성되어 있고 backend는 하나의 파이썬 모듈로 구성이 되어있음. 고로 react의 build context는 ./frontend이지만 backend는 프로젝트 루트 디렉토리로 잡혀서 uvicorn 실행 위치 또한 프로젝트 루트 디렉토리임.

Deploy에 이용하는 스크립트인 run.sh에서 자동으로 git pull을 포함한 build 및 실행을 진행함. 