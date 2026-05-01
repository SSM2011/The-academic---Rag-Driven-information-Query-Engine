FROM node:20-alpine

WORKDIR /app

# Install dependencies first (layer caching)
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY . .

# Create required directories
RUN mkdir -p uploads data/vectors

EXPOSE 5000

CMD ["node", "server.js"]
