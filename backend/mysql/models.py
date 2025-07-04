'''
Retrieve tables from MySQL
'''

from sqlalchemy.ext.automap import automap_base
from sqlalchemy.orm import Session
from ..connection.database import SessionLocal, engine

# Reflect the existing database
Base = automap_base()
Base.prepare(autoload_with=engine)

Users = Base.classes.Users
People = Base.classes.People
Restaurant = Base.classes.Restaurant
Review = Base.classes.Review

print(Base.classes.keys())
