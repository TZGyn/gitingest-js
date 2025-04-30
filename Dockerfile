FROM oven/bun:debian

WORKDIR /app

# Install packages needed to build node modules
RUN apt-get update -qq && \
    apt-get install -y git 


COPY ./package.json ./
COPY ./bun.lock ./

RUN bun install

COPY . .
# COPY ./.env.example ./.env

EXPOSE 3000

CMD ["bun", "src/index.js"]