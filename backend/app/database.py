"""Single shared MongoDB client and database handle."""
from pymongo import MongoClient
from pymongo.errors import PyMongoError

from app.config import settings

# MongoClient connects lazily, so creating it here is safe even if MongoDB is down.
client = MongoClient(settings.mongodb_uri, serverSelectionTimeoutMS=5000)
db = client[settings.database_name]


def check_connection() -> None:
    """Ping MongoDB. Raises RuntimeError with a message that never includes the URI."""
    try:
        client.admin.command("ping")
    except PyMongoError as e:
        raise RuntimeError(
            "Cannot connect to MongoDB. Make sure MongoDB is running and that "
            f"MONGODB_URI in backend/.env is correct ({type(e).__name__})."
        ) from None
