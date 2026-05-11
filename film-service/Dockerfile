FROM node:20-slim

# Install FFmpeg for clip trimming
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json ./
RUN npm install --production
COPY server.js ./
ENV PORT=8080
EXPOSE 8080
CMD ["node", "server.js"]
