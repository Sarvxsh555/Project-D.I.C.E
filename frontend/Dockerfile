FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Dev-mode image for docker-compose (bind-mounts src/ for HMR).
# Swap to an nginx stage serving /app/dist for a production image.
FROM node:22-alpine
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY package.json ./
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]
