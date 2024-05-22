import i18next from 'i18next';
import Backend from 'i18next-fs-backend';

i18next.use(Backend).init({
  lng: 'ru',
  fallbackLng: 'en',
  ns: ['translation'],
  defaultNS: 'translation',
  backend: {
    loadPath: './lang/{{lng}}/{{ns}}.json', // Путь к файлам переводов
  },
  interpolation: {
    escapeValue: false, // Не экранировать переменные
  },
});

export default i18next;
