from flask import Flask, request, Response
import os
from pathlib import Path

app = Flask(__name__)

# Data directory for storing logs
# Where to store log file separately from vstorage
# Default to ./storage_python/data relative to this script if the DATA_DIR environment variable is not set
DATA_DIR = os.environ.get("DATA_DIR", os.path.join(os.path.dirname(__file__), "data"))
Path(DATA_DIR).mkdir(parents=True, exist_ok=True)
LOG_FILE = os.path.join(DATA_DIR, "log.txt")

@app.get('/health')
def health():
    return Response("OK", mimetype='text/plain')

@app.post('/log')
def post_log():
    # Append received log data to log file
    # Ensure it ends with a newline
    body = request.get_data(as_text=True) or ""
    if body and not body.endswith('\n'):
        body += '\n'
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(body)
    return ("", 204)

@app.get('/log')
def get_log():
    if not os.path.exists(LOG_FILE):
        return Response("No log file found.\n", mimetype='text/plain')
    with open(LOG_FILE, "r", encoding="utf-8") as f:
        data = f.read()
    return Response(data, mimetype='text/plain')

if __name__ == '__main__':
    # For testing in binding localhost only --> app.run(host='127.0.0.1', port=8080)
    # Bind all interfaces so other containers can reach it
    app.run(host='0.0.0.0', port=8080)
