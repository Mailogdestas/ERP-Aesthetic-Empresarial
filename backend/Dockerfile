FROM node:18 AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci || (echo "Instale o npm lock file ou ajuste" && exit 1)
COPY . .
# Gera Prisma Client antes do build
RUN npx prisma generate
RUN npm run build

FROM node:18
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --only=production || npm i --only=production
COPY --from=builder /app/dist ./dist
COPY prisma ./prisma
# Copia Prisma Client gerado do builder para garantir disponibilidade em produção
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
CMD ["node", "dist/main.js"]