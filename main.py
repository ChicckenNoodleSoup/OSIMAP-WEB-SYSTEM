from fastapi import FastAPI
from sqlalchemy import create_engine, Column, Integer, String, Float, Date, Time
from sqlalchemy.orm import sessionmaker, declarative_base

from fastapi import Depends
from sqlalchemy.orm import Session

app = FastAPI()

# ---- Database Config ----
DATABASE_URL = "mysql+pymysql://root:root@localhost:3309/_test excel to sql"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# ---- Table Model ----
class Accident(Base):
    __tablename__ = "accidents"   # match your actual table name
    id = Column(Integer, primary_key=True, index=True)
    barangay = Column(String(45))
    dateCommitted = Column(Date)
    timeCommitted = Column(Time)
    lat = Column(Float)
    lng = Column(Float)
    offense = Column(String(45))

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Create tables if they don’t exist
Base.metadata.create_all(bind=engine)

@app.get("/api/geojson")
def get_geojson(db: Session = Depends(get_db)):
    accidents = db.query(Accident).all()

    features = []
    for a in accidents:
        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [a.lng, a.lat]  # GeoJSON uses [lon, lat]
            },
            "properties": {
                "id": a.id,
                "barangay": a.barangay,
                "date": a.dateCommitted.isoformat() if a.dateCommitted else None,
                "time": a.timeCommitted.isoformat() if a.timeCommitted else None,
                "offense": a.offense
            }
        })

    return {
        "type": "FeatureCollection",
        "features": features
    }
