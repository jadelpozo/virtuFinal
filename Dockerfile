FROM node:latest
RUN mkdir -p /usr/src/musicfeel
WORKDIR /usr/src/musicfeel
COPY package.json /usr/src/musicfeel/
RUN npm install
COPY . /usr/src/musicfeel
EXPOSE 8888

CMD [ "node", "./authorization_code/app.js" ]
