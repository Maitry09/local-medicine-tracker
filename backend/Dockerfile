FROM node:18-alpine
WORKDIR /usr/src/app

# Install deps
COPY package.json package-lock.json* pnpm-lock.yaml* ./
RUN npm install --production

# Copy source
COPY . .

ENV NODE_ENV=production
EXPOSE 5000
CMD ["node", "server.js"]
