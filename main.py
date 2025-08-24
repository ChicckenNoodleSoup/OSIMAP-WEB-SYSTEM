from fastapi import FastAPI
from sqlalchemy import create_engine, Column, Integer, String, Float, Date, Time
from sqlalchemy.orm import sessionmaker, declarative_base

from fastapi import Depends
from sqlalchemy.orm import Session

app = FastAPI()

# ---- Database Config ----
DATABASE_URL = "mysql+pymysql://root:root@localhost:3309/osimap_web_test"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# ---- Table Model ----
class Accident(Base):
    __tablename__ = "accidents"   # match your actual table name
    accident_id = Column(Integer, primary_key=True, index=True)
    barangay = Column(String(45))
    dateCommitted = Column(Date)
    timeCommitted = Column(Time)
    lat = Column(Float)
    lng = Column(Float)
    type = Column(String(45))

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
                "id": a.accident_id,
                "barangay": a.barangay,
                "date": a.dateCommitted.isoformat() if a.dateCommitted else None,
                "time": a.timeCommitted.isoformat() if a.timeCommitted else None,
                "type": a.type
            }
        })

    return {
        "type": "FeatureCollection",
        "features": features
    }
