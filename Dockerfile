# Legal AI Platform — ảnh MỘT-tiến-trình cho VAYS Portable (mẫu triển khai kind=git).
#
# Repo là monorepo client + server, KHÔNG có package.json ở gốc, nên nhận diện tự động của nền
# tảng không có gì để bám. Dockerfile này gộp thành một dịch vụ đúng hợp đồng mẫu (một app, một
# cổng HTTP): Express phục vụ API `/v1/*` và phục vụ luôn bản dựng React ở `client/dist`
# (server/src/app.js trỏ `../../client/dist`).

# ── 1) Dựng giao diện React (Vite) ──
FROM node:20-alpine AS client
WORKDIR /src/client
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client ./
# Địa chỉ API nhúng lúc BUILD. Bỏ trống ⇒ client gọi http://localhost:8080 (chỉ hợp máy lập trình).
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# ── 2) Máy chủ Express + Prisma ──
FROM node:20-alpine
WORKDIR /app
# openssl: Prisma engine cần trên alpine. postgresql-client: entrypoint áp database/init.sql lần đầu.
RUN apk add --no-cache openssl postgresql-client

COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci
COPY server ./server
RUN cd server && npx prisma generate

COPY --from=client /src/client/dist ./client/dist
COPY database ./database
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENV APP_PORT=8080
EXPOSE 8080
WORKDIR /app/server
CMD ["/usr/local/bin/docker-entrypoint.sh"]
