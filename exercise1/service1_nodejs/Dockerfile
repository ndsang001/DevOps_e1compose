FROM node:20-alpine
# Install wget for the healthcheck
RUN apk add --no-cache wget
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev
COPY server.js ./
# Mount /app/vstorage to the shared volume
RUN mkdir -p /app/vstorage
EXPOSE 8199
CMD ["node", "server.js"]
