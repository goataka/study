FROM node:22-bookworm-slim

ARG PLAYWRIGHT_VERSION=1.59.1
ARG PLAYWRIGHT_BDD_VERSION=8.5.0

ENV DEBIAN_FRONTEND=noninteractive \
    TZ=Etc/UTC \
    LANG=ja_JP.UTF-8 \
    LC_ALL=ja_JP.UTF-8 \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        fonts-noto-cjk \
        git \
        jq \
        locales \
    && sed -i '/ja_JP.UTF-8/s/^# //g' /etc/locale.gen \
    && locale-gen \
    # ブラウザインストール用の CLI 実行を安定させるため、Playwright をグローバルに導入する
    && npm install -g "@playwright/test@${PLAYWRIGHT_VERSION}" "playwright-bdd@${PLAYWRIGHT_BDD_VERSION}" \
    && npx playwright install --with-deps chromium \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*
