FROM node:22-slim

WORKDIR /app

# Install dependencies (including native better-sqlite3 compilation)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source and build frontend
COPY . .
RUN npm run build

# Database lives in /home/data on Azure (persistent storage)
# Locally it falls back to ./data
RUN mkdir -p data

EXPOSE 8080
ENV PORT=8080
ENV NODE_ENV=production

CMD ["node", "server/index.js"]
