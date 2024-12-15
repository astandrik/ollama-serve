FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build TypeScript
RUN npm install -g typescript
RUN tsc

# Expose the port the server runs on
EXPOSE 3000

# Start the server
CMD ["node", "dist/index.js"]