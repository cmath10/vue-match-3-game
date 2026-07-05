FROM node:24-bookworm-slim

ENV PATH=/home/node/.local/bin:$PATH
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0

RUN mkdir -p /home/node/.local/bin \
  && corepack enable --install-directory /home/node/.local/bin \
  && corepack prepare yarn@1.22.22 --activate

WORKDIR /var/www/vue-match-3-game

VOLUME /var/www/vue-match-3-game

EXPOSE 8080

USER node

CMD ["node"]
