FROM node:20-slim AS production
WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY prisma ./prisma

RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist
COPY --from=build /app/docs ./docs

EXPOSE 5000

CMD ["node", "dist/server.js"]