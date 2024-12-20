# Start with Node.js for building both client and server
FROM node:20-slim AS builder

# Build client
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# Build server
WORKDIR /app/server
COPY server/package*.json ./
RUN npm install
COPY server/ ./
RUN npm install -g typescript
RUN npm run build

# Final stage using Ollama as base
FROM ollama/ollama:latest

# Install Node.js in Ollama image
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    apt-get install -y nginx && \
    rm -rf /var/lib/apt/lists/*

# Setup Nginx directories
RUN rm -rf /usr/share/nginx/html/* && \
				mkdir -p /usr/share/nginx/html

# Copy built client to Nginx directory
COPY --from=builder /app/client/dist/* /usr/share/nginx/html/

# Configure Nginx for React Router
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html; \
        try_files $uri $uri/ /index.html; \
    } \
    location /api { \
        proxy_pass http://localhost:3001; \
        proxy_http_version 1.1; \
        proxy_set_header Upgrade $http_upgrade; \
        proxy_set_header Connection "upgrade"; \
        proxy_set_header Host $host; \
        proxy_cache_bypass $http_upgrade; \
    } \
}' > /etc/nginx/conf.d/default.conf && \
rm -f /etc/nginx/sites-enabled/default

# Copy built server
COPY --from=builder /app/server/dist /app/server/dist
COPY --from=builder /app/server/node_modules /app/server/node_modules

# Create startup script
RUN echo '#!/bin/bash\n\
    nginx &\n\
    cd /app/server && node dist/index.js &\n\
    exec ollama serve' > /start.sh && chmod +x /start.sh

# Expose ports
EXPOSE 80 3001 11434

# Set environment variables
ENV NODE_ENV=production
ENV OLLAMA_HOST=localhost
ENV OLLAMA_PORT=11434

# Start all services
ENTRYPOINT ["/bin/bash"]
CMD ["/start.sh"]