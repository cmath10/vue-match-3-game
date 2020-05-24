FROM node:12.14

RUN npm install -g @vue/cli
RUN npm install -g npm-check
RUN npm install -g karma-cli

WORKDIR /var/www/vue-match-3-game

VOLUME /var/www/vue-match-3-game

# Webpack server
EXPOSE 8080

# Karma.js
EXPOSE 9876

USER node

CMD ["node"]
