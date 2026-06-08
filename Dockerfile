FROM node:22-slim

# Build tools for native modules (better-sqlite3), in case prebuilds are unavailable
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install ALL dependencies (including dev — vite is needed for the build)
COPY package*.json ./
RUN npm ci

# Copy source and build the frontend
COPY . .
RUN npm run build

# Database lives in /home/data on Azure (persistent). Locally falls back to ./data.
RUN mkdir -p data uploads

EXPOSE 8080
ENV PORT=8080
ENV NODE_ENV=production

CMD ["node", "server/index.js"]
