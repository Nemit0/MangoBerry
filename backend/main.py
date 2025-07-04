from fastapi import FastAPI, Depends
# from .routers import elastic_router, mysql_router, mongo_router, keyword_router
from .routers import elastic_router, mysql_router, mongo_router, review, upload

app = FastAPI()

app.include_router(elastic_router.router)
app.include_router(mysql_router.router)
app.include_router(mongo_router.router)
app.include_router(review.router)
app.include_router(upload.router)
# app.include_router(keyword_router.router, prefix="/api")
