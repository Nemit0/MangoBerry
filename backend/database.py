from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = "mysql+pymysql://mangoberry:mangoberry@10.241.144.46:3306/MangoBerry"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

with engine.connect() as conn:
    result = conn.execute(text("SELECT * FROM Users"))
    for row in result:
        print(row)