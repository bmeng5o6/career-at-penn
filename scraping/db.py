"""Supabase client helper for batch insert/upsert."""

import json
import os
from enum import Enum
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()


def get_client():
    """Create a Supabase client. Returns None if credentials not configured."""
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")
    if not url or not key or url.startswith("https://your-"):
        print("⚠ Supabase not configured — skipping DB operations. Set SUPABASE_URL and SUPABASE_KEY in .env")
        return None

    from supabase import create_client
    return create_client(url, key)


def batch_insert(records: list[dict], table: str = "internships", batch_size: int = 100):
    """Insert records into Supabase in batches."""
    client = get_client()
    if client is None:
        return

    for i in range(0, len(records), batch_size):
        batch = records[i : i + batch_size]
        # Convert UUID and datetime to strings for JSON serialization
        serialized = []
        for record in batch:
            row = {}
            for k, v in record.items():
                if hasattr(v, "isoformat"):
                    row[k] = v.isoformat()
                elif hasattr(v, "hex"):
                    row[k] = str(v)
                else:
                    row[k] = v
            serialized.append(row)

        client.table(table).insert(serialized).execute()
        print(f"  Inserted batch {i // batch_size + 1} ({len(batch)} records)")


def _serialize(obj):
    """Recursively serialize an object for JSON export."""
    if hasattr(obj, "isoformat"):
        return obj.isoformat()
    elif hasattr(obj, "hex") and callable(obj.hex):
        return str(obj)
    elif hasattr(obj, "value") and isinstance(obj, Enum):
        return obj.value
    elif isinstance(obj, dict):
        return {k: _serialize(v) for k, v in obj.items()}
    elif isinstance(obj, (list, tuple)):
        return [_serialize(item) for item in obj]
    return obj


def export_json(data, path: str | Path):
    """Export data (list or dict) to a JSON file."""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)

    serialized = _serialize(data)

    with open(path, "w") as f:
        json.dump(serialized, f, indent=2)

    # Count records if it's a list
    count = len(data) if isinstance(data, list) else "structured"
    print(f"Exported {count} data to {path}")


def export_csv(records: list[dict], path: str | Path):
    """Export records to a CSV file."""
    import csv

    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)

    if not records:
        print(f"No records to export to {path}")
        return

    fieldnames = list(records[0].keys())
    with open(path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for record in records:
            row = {}
            for k, v in record.items():
                if hasattr(v, "isoformat"):
                    row[k] = v.isoformat()
                elif hasattr(v, "hex"):
                    row[k] = str(v)
                elif hasattr(v, "value"):
                    row[k] = v.value
                else:
                    row[k] = v
            writer.writerow(row)
    print(f"Exported {len(records)} records to {path}")
