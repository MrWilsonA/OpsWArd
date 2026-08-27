FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
RUN addgroup -S opsward && adduser -S opsward -G opsward
COPY --from=build --chown=opsward:opsward /app/package.json /app/package-lock.json ./
COPY --from=build --chown=opsward:opsward /app/node_modules ./node_modules
COPY --from=build --chown=opsward:opsward /app/.next ./.next
COPY --from=build --chown=opsward:opsward /app/public ./public
USER opsward
EXPOSE 3000
CMD ["npm", "start"]
