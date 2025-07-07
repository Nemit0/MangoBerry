from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
# from .routers import elastic_router, mysql_router, mongo_router, keyword_router
from .routers import elastic_router, mysql_router, mongo_router, review, upload, keywordExt_router

app = FastAPI()

origins = [
    "http://localhost",
    "http://localhost:80",
    "http://localhost:3000",
    "http://localhost:8000",
    "http://10.241.144.46",
    "http://10.241.144.46:80",
    "http://10.241.144.46:3000",
    "http://10.241.144.46:8000",
    "http://backend",
    "http://backend:80",
    "http://backend:3000",
    "http://backend:8000"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(elastic_router.router)
app.include_router(mysql_router.router)
app.include_router(mongo_router.router)

app.include_router(review.router)
app.include_router(upload.router)
app.include_router(keywordExt_router.router)
# app.include_router(keyword_router.router, prefix="/api")

