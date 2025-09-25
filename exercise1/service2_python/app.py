from flask import Flask, Response
import os, time
from shutil import disk_usage
from datetime import datetime, timezone

app = Flask(__name__)

# Uptime tracking as service lifetime
START_TS = time.time()

# Write to vstorage directory from Service1
# When running locally, vstorage is a local directory
# Default to ./service1_nodejs/vstorage relative to this script if the VSTORAGE_DIR environment variable is not set
VSTORAGE_DIR = os.environ.get("VSTORAGE_DIR", os.path.join(os.path.dirname(__file__), "vstorage"))
os.makedirs(VSTORAGE_DIR, exist_ok=True)
VSTORAGE_FILE = os.path.join(VSTORAGE_DIR, "log.txt")

# Storage service URL
STORAGE_URL = os.environ.get('STORAGE_URL')

def iso_utc_no_millis():
    # Example: 2025-09-20T14:48:00Z (no milliseconds)
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")

def uptime_hours():
    # Uptime in hours with two decimals
    return round((time.time() - START_TS) / 3600, 2)

# Free disk space in MB for root filesystem
def free_disk_mb():
    try:
        _, _, free = disk_usage('/')
        return int(free / (1024 * 1024))
    except Exception as e:
        app.logger.error(f"Error getting free disk space: {e}")
        return -1
    
def build_timestamp2_line():
    return f"Timestamp2: uptime {uptime_hours()} hours, free disk in root: {free_disk_mb()}MB @ {iso_utc_no_millis()}"

def append_to_vstorage(record: str):
    with open(VSTORAGE_FILE, "a", encoding="utf-8") as f:
        f.write(record + '\n')

def post_to_storage(record: str):
    if not STORAGE_URL:
        app.logger.warning("STORAGE_URL not set, skipping POST to storage service")
        return
    import urllib.request
    req = urllib.request.Request(
        f"{STORAGE_URL}/log",
        data=record.encode('utf-8'),
        headers={'Content-Type': 'text/plain'},
        method='POST'
    )
    try:
        with urllib.request.urlopen(req, timeout=2):
            pass
    except Exception:
        app.logger.error(f"Failed to POST to storage service at {STORAGE_URL}")
        pass

@app.get('/health')
def health():
    return Response("OK", mimetype='text/plain')

@app.get('/status')
def status():
    line = build_timestamp2_line()
    append_to_vstorage(line)
    post_to_storage(line)
    return Response(line , mimetype='text/plain')

if __name__ == '__main__':
    # For testing in binding localhost only --> app.run(host='127.0.0.1', port=5000)
    # Bind all interfaces so other containers can reach it
    app.run(host='0.0.0.0', port=5000)