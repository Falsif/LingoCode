// Реестр курсов. Чтобы добавить новый уровень или курс, создайте файл с уроками
// в этой папке, импортируйте его и укажите в нужном юните поле lessons.
// Юнит без lessons показывается в программе как «готовится» (soon).
import enA0 from './en-a0.js';
import pyBasics, { pyProjects } from './py-basics.js';
import htmlBasics, { htmlProjects } from './html-basics.js';

export const COURSES = {
  en: {
    id: 'en', title: 'Английский', short: 'EN', emoji: '🇬🇧', color: 'var(--c-en)',
    units: [
      { id: 'en-A0', code: 'A0', title: 'Полный ноль', desc: 'Алфавит, звуки, чтение, первые слова и предложения', lessons: enA0, pass: 80 },
      { id: 'en-A1', code: 'A1', title: 'Начальный', desc: 'Знакомство, семья, время, Present Simple и Continuous, артикли, предлоги', topics: ['Знакомство и приветствия', 'Рассказ о себе', 'Дом', 'Время', 'Present Simple', 'Present Continuous', 'Артикли', 'Предлоги', 'Простые диалоги'] },
      { id: 'en-A2', code: 'A2', title: 'Элементарный', desc: 'Покупки, путешествия, Past Simple, Future Simple, модальные глаголы', topics: ['Покупки', 'Путешествия и транспорт', 'Работа и хобби', 'Past Simple', 'Future Simple', 'Present Perfect', 'Сравнение прилагательных', 'Модальные глаголы'] },
      { id: 'en-B1', code: 'B1', title: 'Средний', desc: 'Связные рассказы, условные предложения, пассив, косвенная речь', topics: ['Условные предложения', 'Пассивный залог', 'Косвенная речь', 'Адаптированные тексты', 'Выражение мнения'] },
      { id: 'en-B2', code: 'B2', title: 'Выше среднего', desc: 'Фразовые глаголы, идиомы, аргументация, статьи и интервью', topics: ['Фразовые глаголы', 'Идиомы', 'Аргументация', 'Статьи и интервью', 'Формальная речь'] },
      { id: 'en-C1', code: 'C1', title: 'Продвинутый', desc: 'Академическая лексика, сложные конструкции, подтекст', topics: ['Академическая лексика', 'Сложные конструкции', 'Литературные тексты', 'Подтекст'] },
      { id: 'en-C2', code: 'C2', title: 'Высшее владение', desc: 'Стилистика, нюансы значений, художественная литература', topics: ['Стилистика', 'Нюансы значений', 'Редкие выражения', 'Анализ выступлений'] },
    ],
  },
  py: {
    id: 'py', title: 'Python', short: 'PY', emoji: '🐍', color: 'var(--c-py)',
    units: [
      { id: 'py-basics', code: 'Основы', title: 'Начальный уровень', desc: 'print, переменные, типы, ввод, условия, циклы, списки, словари, функции', lessons: pyBasics, projects: pyProjects, pass: 80 },
      { id: 'py-mid', code: 'Средний', title: 'Средний уровень', desc: 'Файлы, ошибки, модули, классы, JSON, алгоритмы', topics: ['Работа с файлами', 'Обработка ошибок', 'Модули и библиотеки', 'Классы и объекты', 'JSON', 'Алгоритмы', 'Генераторы и декораторы'] },
      { id: 'py-adv', code: 'Продвинутый', title: 'Продвинутый уровень', desc: 'Асинхронность, API, базы данных, тестирование', topics: ['Асинхронное программирование', 'HTTP и API', 'Базы данных', 'Тестирование', 'Типизация', 'Оптимизация'] },
    ],
  },
  html: {
    id: 'html', title: 'HTML', short: 'WEB', emoji: '🌐', color: 'var(--c-html)',
    units: [
      { id: 'html-basics', code: 'HTML', title: 'Основы HTML', desc: 'Структура, теги, ссылки, картинки, списки, таблицы, формы, семантика', lessons: htmlBasics, projects: htmlProjects, pass: 80 },
      { id: 'css-basics', code: 'CSS', title: 'Основы CSS', desc: 'Селекторы, цвета, шрифты, отступы, Flexbox, Grid, адаптивность', topics: ['Селекторы', 'Цвета и шрифты', 'Отступы и рамки', 'Flexbox', 'Grid', 'Адаптивная вёрстка'] },
      { id: 'js-basics', code: 'JS', title: 'Основы JavaScript', desc: 'Переменные, функции, DOM, события', topics: ['Переменные и функции', 'Условия и циклы', 'Массивы и объекты', 'DOM', 'События', 'Формы'] },
    ],
  },
};

export const COURSE_IDS = ['en', 'py', 'html'];

// Плоский индекс всех уроков и проектов
const LESSONS = {};
for (const c of Object.values(COURSES)) {
  for (const u of c.units) {
    (u.lessons || []).forEach((l, i) => { LESSONS[l.id] = { ...l, course: c.id, unit: u.id, index: i, kind: 'lesson' }; });
    (u.projects || []).forEach((l) => { LESSONS[l.id] = { ...l, course: c.id, unit: u.id, kind: 'project' }; });
  }
}
export function getLesson(id) { return LESSONS[id]; }
export function getUnit(unitId) {
  for (const c of Object.values(COURSES)) for (const u of c.units) if (u.id === unitId) return { ...u, course: c.id };
  return null;
}
export function allLessons(courseId) {
  return Object.values(LESSONS).filter((l) => (!courseId || l.course === courseId) && l.kind === 'lesson');
}
export function allProjects(courseId) {
  return Object.values(LESSONS).filter((l) => (!courseId || l.course === courseId) && l.kind === 'project');
}
// Все слова, которые встречаются в уроках (для подсказок и тестов)
export function lessonWords(id) { return (LESSONS[id] && LESSONS[id].words) || []; }
