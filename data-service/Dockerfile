FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY tsconfig.json ./
COPY sql ./sql
COPY src ./src
EXPOSE 8093
CMD ["npx", "tsx", "src/server.ts"]
