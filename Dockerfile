FROM oven/bun

WORKDIR /app

COPY ./package.json ./
COPY ./bun.lock ./

RUN bun install

COPY . .
# COPY ./.env.example ./.env

EXPOSE 3000

CMD ["bun", "src/index.js"]