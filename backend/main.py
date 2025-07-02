from fastapi import FastAPI
from .routers import elastic_router, mysql_router, mongo_router, keywordExt_router


app = FastAPI()

app.include_router(elastic_router.router)
app.include_router(mysql_router.router)
app.include_router(mongo_router.router)
app.include_router(keywordExt_router.router)
