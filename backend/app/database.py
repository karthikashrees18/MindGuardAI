"""One Mongo client shared by every module (auth, journal, notifications).
Import `db` and grab the collection you need — don't open new clients
elsewhere."""
from motor.motor_asyncio import AsyncIOMotorClient

from app.config import MONGO_URI, MONGO_DB

client = AsyncIOMotorClient(MONGO_URI)
db = client[MONGO_DB]

users = db["users"]
journals = db["journals"]
contacts = db["contacts"]
