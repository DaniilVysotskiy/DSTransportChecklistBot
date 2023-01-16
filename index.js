const TOKEN = process.env.TELEGRAM_TOKEN;
const ADMIN_USER_CHAT_ID = process.env.ADMIN_USER_CHAT_ID;
const TelegramBot = require('node-telegram-bot-api');;

const bot = new TelegramBot(TOKEN, {
  polling: true
});

const ABOUT_TEXT = `Я бот, который помогает оформить заявку на перевозку груза. Нужно будет заполнить небольшой опросник. Вот он.`
const TITLES = ['Дата готовности', 'Откуда', 'Контакты отправителя', 'Куда', 'Контакты принимающего', 'Документы для перевозки', 'Вес и габариты груза', 'Дата получения груза', 'Комментарии', 'Кто заполнил опросник'];
const QUESTIONS = ['Дата готовности груза к получению (у поставщика)', 'Откуда - Адрес (фактический) забора груза', 'Контактные данные отдающей стороны (телефон, лицо, название организации)', 'Куда - Адрес (фактический) доставки груза', 'Контактные данные принимающей стороны (телефон, лицо, название организации)', 'Документы для перевозки (*сначала загрузить файлы*, если есть pdf или фото документов, а *затем указать текстом* формат сопроводительных документов)', 'Весовые и габаритные характеристики груза', 'Желаемая дата и время доставки (сроки)', 'Комментарии (любая информация, например, что нужно сделать, к кому обратиться, какие документы взять/отдать, необходимость заказа пропуска на территорию поставщика/организации)', 'ФИО заполнявшего опросник'];
const FINISH_TEXT_1 = 'Спасибо за заполненный опросник\! Вот что в нем указано.';
const FINISH_TEST_2 = 'Проверь, все ли указано верно? Если все правильно, жми “Верно” - и я отправлю эти данные в отдел логистики. Если нет - то жми “Нужно поправить”, тогда мы вместе заполним опросник еще раз.';
const STOP_TEXT = 'Хорошо. Я удалил все записанное. Пиши еще.';
const COMPLETE_TEXT = 'Сохранено! Давай, пиши еще \/start, когда захочешь\!';
const SESSION_CHECKLIST_MAP = {};

const resetSession = (id) => {
  SESSION_CHECKLIST_MAP[id] = { questions: [], answers: [], msgIdsWithFiles: [] };
};

const getNextQuestion = (idx) => {
  return QUESTIONS[idx];
};


const getFormattedAnswers = (id) => {
  return SESSION_CHECKLIST_MAP[id].answers.map((answer, i) => `${getNumberForList(i + 1)} ${TITLES[i]}: ${answer}`).join('\n')
};

const getNumberForList = (number) => {
  return `${number}.`;
};

const getFinalReport = (id) => {
  const answers = getFormattedAnswers(id);
  return `${FINISH_TEXT_1} \n\n${answers} \n\n${FINISH_TEST_2}`;
};

const augmentQuestionsAndAnswers = (msg, idx) => {
  SESSION_CHECKLIST_MAP[msg.chat.id].questions.push(idx + 1);
  SESSION_CHECKLIST_MAP[msg.chat.id].answers[idx - 1] = msg.text;
};

bot.onText(/\/help/, (msg) => {
  const reply = `/help - показать доступные команды
/start - начать заполнять опросник
/stop - прервать заполнение опросника`;
  bot.sendMessage(msg.chat.id, reply);
});

bot.onText(/\/id/, (msg) => {
  bot.sendMessage(msg.chat.id, JSON.stringify(msg.chat));
});

bot.onText(/\/start/, (msg) => {
  const reply = `${ABOUT_TEXT} \n\n${TITLES.map((title, i) => `${getNumberForList(++i)} ${title}`).join('\n')}`;
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
  const idx = SESSION_CHECKLIST_MAP[msg.chat.id]?.questions.length;
  if (!idx) return;

  let reply = '';
  let opts = {
      parse_mode: 'Markdown',
  };
  augmentQuestionsAndAnswers(msg, idx);

  if (SESSION_CHECKLIST_MAP[msg.chat.id].questions.length <= QUESTIONS.length) {
    reply = getNextQuestion(idx);
  } else {
    reply = getFinalReport(msg.chat.id);
    opts = {
      ...opts,
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
    const answers = `${getFormattedAnswers(msg.chat.id)} \n\nОтправил: ${msg.chat.username}`;
    reply = COMPLETE_TEXT;
    bot.sendMessage(ADMIN_USER_CHAT_ID, answers);
    SESSION_CHECKLIST_MAP[msg.chat.id].msgIdsWithFiles.forEach(msgId => {
      bot.forwardMessage(ADMIN_USER_CHAT_ID, msg.chat.id, msgId);
    });
  }

  bot.sendMessage(msg.chat.id, reply);
});

bot.on('message', (msg) => {
  const currentQuestion = SESSION_CHECKLIST_MAP[msg.chat.id]?.questions.length;
  if ((msg.document || msg.photo) && currentQuestion === 6) {
    SESSION_CHECKLIST_MAP[msg.chat.id].msgIdsWithFiles.push(msg.message_id);
  }
});

bot.on("polling_error", console.log);
