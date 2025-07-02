from fastapi import FastAPI, Depends
from routers import elastic_router, mysql_router, mongo_router

app = FastAPI()

app.include_router(elastic_router.router)
app.include_router(mysql_router.router)
app.include_router(mongo_router.router)

