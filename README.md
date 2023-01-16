# DSTransportChecklistBot

Простой телеграм polling-бот, который реализует функциональность опросника с последующей отправкой итогового отчета на личный аккаунт "админа".

Запускается проект просто:

```
TELEGRAM_TOKEN=bot_token ADMIN_USER_CHAT_ID=chat_id node index.js
```
, где `TELEGRAM_TOKEN` и `ADMIN_USER_CHAT_ID` - это env-переменные, `bot_token` - это API-токен бота, а `chat_id` - это id чата, куда будут слаться итоговые отчеты от бота (узнать персональный id чата можно, добавив бота себе и отослав ему команду `/id`).

Для разворачивания на сервере рекомендуется использовать утилиту [pm2](https://pm2.keymetrics.io/docs/usage/quick-start/), которая позволяет запускать node-процессы (и не только) в фоновом режиме и держать бота на сервере включенным 24/7, например так:

```
pm2 TELEGRAM_TOKEN=bot_token ADMIN_USER_CHAT_ID=chat_id start index.js
```
