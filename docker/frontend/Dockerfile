FROM node:latest

WORKDIR /app

COPY package*.json .
RUN npm i

EXPOSE 5173
CMD [ "npm", "run", "dev", "--", "--host" ]
