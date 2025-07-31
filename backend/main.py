import sys
sys.stdout.reconfigure(encoding='utf-8')

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware

from .connection import load_env

from .routers import (
    admin_router, 
    keyword_router, 
    restaurant_router, 
    review_image_router, 
    review_router, 
    review_search_router, 
    social_router
)

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

app.include_router(admin_router.router)
app.include_router(restaurant_router.router)
app.include_router(social_router.router)
app.include_router(review_router.router)
app.include_router(review_search_router.router)
app.include_router(review_image_router.router)
app.include_router(keyword_router.router)