FROM node:20-alpine

# Install wget for the healthcheck
RUN apk add --no-cache wget

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev
COPY server.js ./
# Ensure the vstorage path exists. Compose will mount a volume here
RUN mkdir -p /app/vstorage
EXPOSE 8199
CMD ["node", "server.js"]
