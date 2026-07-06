FROM mcr.microsoft.com/playwright:v1.61.1-jammy

ENV PATH=/opt/corepack/bin:$PATH
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0

RUN mkdir -p /opt/corepack/bin \
  && corepack enable --install-directory /opt/corepack/bin \
  && corepack prepare yarn@1.22.22 --activate

WORKDIR /var/www/vue-match-3-game
