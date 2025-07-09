import os

from sqlalchemy.ext.automap import automap_base
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

import backend.connection.load_env

DATABASE_URL = os.getenv("SQL_URL")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = automap_base()

Base.prepare(autoload_with=engine)

Users = Base.classes.Users
People = Base.classes.People
Restaurant = Base.classes.Restaurant
Review = Base.classes.Review

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()