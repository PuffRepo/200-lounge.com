FROM node:24-bookworm-slim AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
# Optional trust bundle for development networks that provide their own HTTPS CA.
# Railway normally needs no secret; TLS verification remains enabled either way.
RUN --mount=type=secret,id=network-ca \
    if [ -f /run/secrets/network-ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/network-ca; fi; \
    npm ci --ignore-scripts --no-audit --no-fund --cache /tmp/npm-cache

FROM node:24-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=8080
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
USER node
EXPOSE 8080
CMD ["node", "server.js"]
