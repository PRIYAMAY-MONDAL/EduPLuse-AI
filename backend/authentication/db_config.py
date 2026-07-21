import os
from pathlib import Path
from dotenv import load_dotenv
from pymongo import MongoClient

# Look for the .env file globally from the root application folder directory
BASE_DIR = Path(__file__).resolve().parent.parent
env_path = BASE_DIR / '.env'

# Explicitly pass the strict absolute path parameters to load_dotenv
load_dotenv(dotenv_path=env_path)

def get_db_credentials():
    """Extracts credentials safely from environment variables with fallbacks."""
    user = os.getenv("MONGO_DB_USER")
    passwd = os.getenv("MONGO_DB_PASSWORD")
    cluster = os.getenv("MONGO_DB_CLUSTER")
    db_name = os.getenv("MONGO_DB_NAME")

    # Safety Check: Warn early before passing bad variables to PyMongo
    if not all([user, passwd, cluster, db_name]):
        raise RuntimeError(
            f"Environment Loading Failure: Double check your .env file is present at '{env_path}' "
            f"and contains all variables. Currently loaded: USER={user}, CLUSTER={cluster}"
        )

    return {
        "user": user,
        "pass": passwd,
        "cluster": cluster,
        "name": db_name,
    }

def get_mongo_collection(collection_name):
    """Establishes connection to the target MongoDB Atlas cluster collection."""
    creds = get_db_credentials()
    
    # Standard Atlas SRV syntax mapping configuration
    uri = f"mongodb+srv://{creds['user']}:{creds['pass']}@{creds['cluster']}/{creds['name']}?retryWrites=true&w=majority"
    
    client = MongoClient(uri)
    db = client[creds['name']]
    
    return db[collection_name]