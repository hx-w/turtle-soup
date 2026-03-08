# Stage 1: Build client
FROM node:20-alpine AS client-build
RUN npm config set registry https://registry.npmmirror.com
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Stage 2: Build server
FROM node:20-alpine AS server-build
RUN npm config set registry https://registry.npmmirror.com
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci
COPY server/ ./
RUN npx prisma generate
RUN npm run build

# Stage 3: Production
FROM node:20-alpine
WORKDIR /app

# Install PostgreSQL client for migration
RUN apk add --no-cache postgresql-client netcat-openbsd

COPY --from=server-build /app/server/dist ./dist
COPY --from=server-build /app/server/node_modules ./node_modules
COPY --from=server-build /app/server/package.json ./
COPY --from=server-build /app/server/prisma ./prisma
COPY --from=client-build /app/client/dist ./public
COPY scripts/start.sh ./start.sh
RUN chmod +x start.sh

EXPOSE 3000
CMD ["./start.sh"]

