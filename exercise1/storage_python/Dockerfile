FROM python:3.12-alpine
WORKDIR /app
RUN pip install --no-cache-dir Flask
COPY app.py ./
# Declare a path for persisted data. A named volume will be mounted here
VOLUME ["/var/lib/storage"]
EXPOSE 8080
CMD ["python", "app.py"]
