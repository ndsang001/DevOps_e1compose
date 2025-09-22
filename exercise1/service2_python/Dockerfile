FROM python:3.12-alpine
WORKDIR /app
RUN pip install --no-cache-dir Flask
COPY app.py ./
# Mount /app/vstorage to the shared volume
RUN mkdir -p /app/vstorage
EXPOSE 5000
CMD ["python", "app.py"]
