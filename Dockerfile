FROM node:22

WORKDIR /undelete

COPY . .

RUN npm ci

EXPOSE 8080

CMD ["npm", "start"]