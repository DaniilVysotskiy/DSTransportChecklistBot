const TOKEN = process.env.TELEGRAM_TOKEN;
const ADMIN_USER_CHAT_ID = process.env.ADMIN_USER_CHAT_ID;
const TelegramBot = require('node-telegram-bot-api');;

const bot = new TelegramBot(TOKEN, {
  polling: true
});

const ABOUT_TEXT = `Привет. Я бот, который помогает оформить заявку на перевозку груза. Нужно будет заполнить небольшой опросник. Вот он.

1. Дата готовности
2. Откуда
3. Контакты отправителя
4. Куда
5. Контакты принимающего
6. Документы для перевозки
7. Вес и габариты груза
8. Дата получения груза
9. Комментарии
10. Кто заполнил опросник`
const QUESTIONS = ['1. Дата готовности груза к получению (у поставщика)', '2. Откуда - Адрес (фактический) забора груза', '3. Контактные данные отдающей стороны (телефон, лицо, название организации)', '4. Куда - Адрес (фактический) доставки груза', '5. Контактные данные принимающей стороны (телефон, лицо, название организации)', '6. Документы для перевозки (если нужна доверенность, то номер счета, если нужны какие-либо другие сопроводительные документы - указать)', '7. Весовые и габаритные характеристики груза', '8. Желаемая дата и время доставки (сроки)', '9. Комментарии (любая доп. информация, например, что нужно сделать, к кому обратиться, какие документы взять/отдать, необходимость заказа пропуска на территорию поставщика/организации)', '10. ФИО заполнявшего опросник'];
const FINISH_TEXT_1 = 'Молодец! Спасибо за заполненный опросник! Вот что ты указал в нем.';
const FINISH_TEST_2 = 'Проверь, все ли указано верно? Если все правильно, жми “Верно” - и я отправлю эти данные в отдел логистики. Если нет - то жми “Нужно поправить”, тогда мы вместе заполним опросник еще раз.';
const STOP_TEXT = 'Хорошо. Я удалил все записанное. Давай попробуем еще раз, как будешь готов.';
const COMPLETE_TEXT = 'Сохранено! Давай, пиши еще!';
const SESSION_CHECKLIST_MAP = {};

const resetSession = (id) => {
  SESSION_CHECKLIST_MAP[id] = { questions: [], answers: [] };
};

const getNextQuestion = (idx) => {
  return QUESTIONS[idx];
}


const getFormattedAnswers = (id) => {
  return SESSION_CHECKLIST_MAP[id].answers.map((answer, i) => `${++i}. ${answer}`).join('\n')
};

const getFinalReport = (id) => {
  const answers = getFormattedAnswers(id);
  return `${FINISH_TEXT_1} \n\n${answers} \n\n${FINISH_TEST_2}`;
}

const augmentQuestionsAndAnswers = (msg, idx) => {
  SESSION_CHECKLIST_MAP[msg.chat.id].questions.push(idx + 1);
  SESSION_CHECKLIST_MAP[msg.chat.id].answers[idx - 1] = msg.text;
};

bot.onText(/\/help/, (msg) => {
  const reply = `/help - показать доступные команды
/about - показать приветственное сообщение
/start - начать заполнять опросник
/stop - прервать заполнение опросника`;
  bot.sendMessage(msg.chat.id, reply);
});

bot.onText(/\/id/, (msg) => {
  bot.sendMessage(msg.chat.id, JSON.stringify(msg.chat));
})

bot.onText(/\/about/, (msg) => {
  const reply = ABOUT_TEXT;
  bot.sendMessage(msg.chat.id, reply);
});

bot.onText(/\/start/, (msg) => {
  const reply = ABOUT_TEXT;
  const opts = {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: '📝 Подать заявку',
            callback_data: 'start_checklist'
          }
        ]
      ]
    }
  };
  bot.sendMessage(msg.chat.id, reply, opts);
});

bot.onText(/\/stop/, (msg) => {
  const reply = STOP_TEXT;
  resetSession(msg.chat.id);
  bot.sendMessage(msg.chat.id, reply);
});

bot.onText(/[^/help|/about|/start|/stop/]+/, (msg) => {
  let reply = '';
  let opts = {};
  const idx = SESSION_CHECKLIST_MAP[msg.chat.id].questions.length;
  augmentQuestionsAndAnswers(msg, idx);

  if (SESSION_CHECKLIST_MAP[msg.chat.id].questions.length <= QUESTIONS.length) {
    reply = getNextQuestion(idx);
  } else {
    reply = getFinalReport(msg.chat.id);
    opts = {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '❌ Нужно поправить',
              callback_data: 'start_checklist'
            },
            {
              text: '✅ Верно',
              callback_data: 'valid_checklist'
            },
          ]
        ]
      }
    };
  }

  bot.sendMessage(msg.chat.id, reply, opts);
});

// Handle callback queries
bot.on('callback_query', (callbackQuery) => {
  const action = callbackQuery.data;
  const msg = callbackQuery.message;
  let reply = '';

  if (action === 'start_checklist') {
    resetSession(msg.chat.id);
    reply = QUESTIONS[0];
    SESSION_CHECKLIST_MAP[msg.chat.id].questions.push(1);
  }

  if (action === 'valid_checklist') {
    const answers = getFormattedAnswers(msg.chat.id);
    reply = COMPLETE_TEXT;
    bot.sendMessage(ADMIN_USER_CHAT_ID, answers);
  }

  bot.sendMessage(msg.chat.id, reply);
});