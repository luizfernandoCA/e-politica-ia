# ---------- build (Vite) ----------
FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# VITE_* são opcionais: src/supabase.js tem fallback para a chave publicável.
RUN npm run build

# ---------- runtime (Node) ----------
FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
# Só dependências de produção (inclui express).
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
# Artefatos necessários em runtime.
COPY --from=build /app/dist ./dist
COPY api ./api
COPY lib ./lib
COPY server.js ./
EXPOSE 3000
CMD ["node", "server.js"]
