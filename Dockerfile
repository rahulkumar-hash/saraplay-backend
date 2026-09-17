FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN node obfuscate.js && rm obfuscate.js && npm prune --production

ENV NODE_ENV=production

EXPOSE 3003

CMD ["node", "server.js"]