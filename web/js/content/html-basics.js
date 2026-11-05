// HTML — курс для начинающих.
// Задания 'html' проверяются анализом структуры документа (DOMParser), а не сравнением текста:
//   checks: [{ sel: 'css-селектор', min, max, text: 'regex', attr: 'имя', attrRe: 'regex', msg }]
//   src:    [{ re: 'regex по исходнику', msg }]  — для того, что браузер «исправляет» сам (doctype и т.п.)
// В заданиях можно использовать картинки из встроенной папки: cat.svg, mountains.svg, logo.svg, avatar.svg

export default [
  {
    id: 'html-01', title: 'Что такое сайт и HTML', goal: 'Понять, из чего состоит веб-страница и что такое теги.',
    theory: [
      { t: 'p', text: '**Сайт** — это набор веб-страниц. Браузер (Chrome, Firefox) скачивает файл страницы и рисует её на экране. Основа каждой страницы — язык **HTML** (HyperText Markup Language — язык гипертекстовой разметки).' },
      { t: 'p', text: 'HTML — не язык программирования, а **язык разметки**: он описывает, *что* находится на странице — заголовок, абзац, картинка, ссылка.' },
      { t: 'p', text: 'Разметка делается с помощью **тегов** — слов в угловых скобках. Большинство тегов парные: **открывающий** `<p>` и **закрывающий** `</p>` (со слешем). Вместе с содержимым они образуют **элемент**.' },
      { t: 'code', lang: 'html', code: '<h1>Мой первый сайт</h1>\n<p>Это абзац текста.</p>' },
      { t: 'tip', text: 'Рядом с HTML всегда идут CSS (оформление: цвета, шрифты, расположение) и JavaScript (поведение: кнопки, анимации). HTML — это скелет, CSS — внешность, JavaScript — движения.' },
    ],
    exercises: [
      { k: 'choice', q: 'Что такое HTML?', opts: ['Язык разметки веб-страниц', 'Программа-браузер', 'Язык для баз данных'], a: 0, why: 'HTML описывает структуру и содержимое страницы.' },
      { k: 'choice', q: 'Как выглядит закрывающий тег для `<p>`?', opts: ['<p/>', '</p>', '<\\p>'], a: 1, why: 'Закрывающий тег содержит слеш перед именем: </p>.' },
      { k: 'html', task: 'Нажмите **«Проверить»** — на вкладке «Результат» вы увидите, как браузер показывает этот код. Затем измените текст в заголовке на любой свой и проверьте снова.', starter: '<h1>Привет, веб!</h1>\n<p>Я учу HTML.</p>', checks: [{ sel: 'h1', min: 1, msg: 'Нужен заголовок <h1>' }, { sel: 'h1', text: '^(?!Привет, веб!$).+', msg: 'Измените текст заголовка на свой' }], hints: ['Поменяйте слова между <h1> и </h1>.'], solution: '<h1>Мой сайт</h1>\n<p>Я учу HTML.</p>' },
    ],
    quiz: [
      { k: 'choice', q: 'Что отвечает за оформление страницы (цвета, шрифты)?', opts: ['HTML', 'CSS', 'Браузер сам'], a: 1 },
      { k: 'choice', q: 'Как называется связка «открывающий тег + содержимое + закрывающий тег»?', opts: ['Элемент', 'Атрибут', 'Сайт'], a: 0 },
    ],
  },

  {
    id: 'html-02', title: 'Структура HTML-документа', goal: 'Писать правильный каркас страницы: doctype, html, head, body.',
    theory: [
      { t: 'p', text: 'У каждой правильной страницы одинаковый каркас:' },
      { t: 'code', lang: 'html', code: '<!DOCTYPE html>\n<html lang="ru">\n  <head>\n    <meta charset="UTF-8">\n    <title>Название во вкладке</title>\n  </head>\n  <body>\n    <h1>Содержимое страницы</h1>\n  </body>\n</html>' },
      { t: 'table', head: ['Часть', 'Зачем'], rows: [
        ['<!DOCTYPE html>', 'Говорит браузеру: это современный HTML5'],
        ['<html lang="ru">', 'Корень страницы; lang — язык содержимого'],
        ['<head>', 'Служебная информация, не видна на странице'],
        ['<meta charset="UTF-8">', 'Кодировка — чтобы русские буквы не превратились в «кракозябры»'],
        ['<title>', 'Текст на вкладке браузера и в поисковиках'],
        ['<body>', 'Всё, что видно на странице'],
      ] },
      { t: 'tip', text: 'Отступы внутри тегов не обязательны, но делают код понятным: сразу видно, что внутри чего находится. Это называется **вложенность**.' },
    ],
    exercises: [
      { k: 'choice', q: 'Где пишут то, что видно на странице?', opts: ['<head>', '<body>', '<title>'], a: 1, why: 'Видимое содержимое — внутри <body>.' },
      { k: 'choice', q: 'Что задаёт текст на вкладке браузера?', opts: ['<h1>', '<title>', '<meta>'], a: 1, why: '<title> внутри <head>.' },
      { k: 'html', task: 'Напишите **полный каркас** страницы: `<!DOCTYPE html>`, `<html lang="ru">`, `<head>` с `<meta charset="UTF-8">` и `<title>Моя страница</title>`, а в `<body>` — заголовок `<h1>` с любым текстом.', starter: '', src: [{ re: '<!doctype html>', msg: 'В самом начале нужен <!DOCTYPE html>' }, { re: '<html[^>]*>', msg: 'Нужен тег <html>' }, { re: '<head[^>]*>', msg: 'Нужен тег <head>' }, { re: '<body[^>]*>', msg: 'Нужен тег <body>' }, { re: '</html>', msg: 'Не забудьте закрыть </html>' }], checks: [
        { sel: 'html[lang]', min: 1, msg: 'Укажите язык: <html lang="ru">' }, { sel: 'head meta[charset]', min: 1, msg: 'В <head> нужен <meta charset="UTF-8">' },
        { sel: 'head title', text: '^Моя страница$', msg: 'В <head> нужен <title>Моя страница</title>' }, { sel: 'body h1', min: 1, text: '.', msg: 'В <body> нужен заголовок <h1> с текстом' },
      ], hints: ['Посмотрите на пример в теории и повторите его.', 'Порядок: <!DOCTYPE html>, затем <html lang="ru">, внутри — <head>...</head> и <body>...</body>.'], solution: '<!DOCTYPE html>\n<html lang="ru">\n  <head>\n    <meta charset="UTF-8">\n    <title>Моя страница</title>\n  </head>\n  <body>\n    <h1>Привет!</h1>\n  </body>\n</html>' },
      { k: 'error', q: 'Какая часть каркаса записана неправильно?', tokens: ['<!DOCTYPE html>', '<html lang="ru">', '<body>', '<head>...</head>', '</body>'], a: 3, why: '<head> должен идти до <body>, а не внутри него.' },
    ],
    quiz: [
      { k: 'choice', q: 'Зачем нужен <meta charset="UTF-8">?', opts: ['Чтобы правильно отображались буквы разных языков', 'Чтобы страница быстрее грузилась', 'Для красоты'], a: 0 },
      { k: 'choice', q: 'Что пишут самой первой строкой?', opts: ['<html>', '<!DOCTYPE html>', '<head>'], a: 1 },
    ],
  },

  {
    id: 'html-03', title: 'Заголовки h1–h6', goal: 'Строить иерархию заголовков на странице.',
    theory: [
      { t: 'p', text: 'В HTML шесть уровней заголовков: от **<h1>** (самый главный и крупный) до **<h6>** (самый мелкий).' },
      { t: 'code', lang: 'html', code: '<h1>Рецепты</h1>\n<h2>Завтраки</h2>\n<h3>Омлет</h3>\n<h3>Блины</h3>\n<h2>Обеды</h2>' },
      { t: 'p', text: 'Заголовки — как оглавление книги. **h1** обычно один на странице — это её тема. Разделы — h2, подразделы — h3 и так далее.' },
      { t: 'tip', text: 'Не выбирайте заголовок по размеру шрифта! Размер можно изменить через CSS. Уровень заголовка должен отражать **смысл** — это важно для поисковиков и людей с программами чтения с экрана.' },
    ],
    exercises: [
      { k: 'choice', q: 'Какой заголовок самый важный?', opts: ['<h6>', '<h1>', '<head>'], a: 1, why: 'h1 — главный заголовок.' },
      { k: 'html', task: 'Сделайте страницу о любимом животном: один `<h1>` с названием и **два** раздела `<h2>`: «Внешность» и «Характер».', starter: '', checks: [
        { sel: 'h1', min: 1, max: 1, text: '.', msg: 'Нужен ровно один <h1> с текстом' }, { sel: 'h2', min: 2, msg: 'Нужно минимум два заголовка <h2>' },
        { sel: 'h2', text: 'Внешность', msg: 'Один из <h2> должен называться «Внешность»' }, { sel: 'h2', text: 'Характер', msg: 'Один из <h2> должен называться «Характер»' },
      ], hints: ['<h1>Кошки</h1>', '<h2>Внешность</h2> и ниже <h2>Характер</h2>'], solution: '<h1>Кошки</h1>\n<h2>Внешность</h2>\n<h2>Характер</h2>' },
      { k: 'error', q: 'Где нарушена иерархия заголовков?', tokens: ['<h1>Игры</h1>', '<h2>Стратегии</h2>', '<h5>Новинки</h5>', '<h2>Гонки</h2>'], a: 2, why: 'После h2 не стоит прыгать сразу на h5 — подраздел должен быть h3.' },
    ],
    quiz: [
      { k: 'choice', q: 'Сколько уровней заголовков в HTML?', opts: ['3', '6', '10'], a: 1 },
      { k: 'choice', q: 'Сколько h1 обычно бывает на странице?', opts: ['Один', 'Сколько угодно, чем больше — тем лучше', 'Ни одного'], a: 0 },
    ],
  },

  {
    id: 'html-04', title: 'Абзацы и форматирование текста', goal: 'Оформлять текст абзацами, выделять важное.',
    theory: [
      { t: 'p', text: '**<p>** — абзац (paragraph). Браузер сам добавляет отступы между абзацами. Лишние пробелы и переносы строк в коде браузер **схлопывает** в один пробел.' },
      { t: 'code', lang: 'html', code: '<p>Первый абзац.</p>\n<p>Второй абзац. Тут      много пробелов,\nно браузер покажет один.</p>' },
      { t: 'table', head: ['Тег', 'Значение', 'Тип'], rows: [
        ['<strong>', 'важный текст (жирный)', 'парный'], ['<em>', 'смысловое ударение (курсив)', 'парный'],
        ['<br>', 'перенос строки', 'одиночный'], ['<hr>', 'горизонтальная линия, смена темы', 'одиночный'],
      ] },
      { t: 'p', text: '**Одиночные теги** не имеют закрывающей пары — у них нет содержимого.' },
      { t: 'code', lang: 'html', code: '<p>Это <strong>очень важно</strong>, а это — <em>с ударением</em>.</p>\n<p>Строка 1<br>Строка 2</p>' },
      { t: 'tip', text: 'Теги можно вкладывать, но закрывать нужно в обратном порядке: `<p><strong>текст</strong></p>` — правильно, `<p><strong>текст</p></strong>` — ошибка.' },
    ],
    exercises: [
      { k: 'choice', q: 'Какой тег делает перенос строки?', opts: ['<br>', '<p>', '<hr>'], a: 0, why: '<br> — break, разрыв строки.' },
      { k: 'html', task: 'Напишите **два абзаца** о себе. В первом выделите что-нибудь важное тегом `<strong>`, во втором — тегом `<em>`.', starter: '', checks: [
        { sel: 'p', min: 2, msg: 'Нужно минимум два абзаца <p>' }, { sel: 'p strong', min: 1, text: '.', msg: 'Внутри абзаца нужен <strong> с текстом' }, { sel: 'p em', min: 1, text: '.', msg: 'Внутри абзаца нужен <em> с текстом' },
      ], hints: ['<p>Я <strong>люблю</strong> игры.</p>', '<strong> и <em> должны быть внутри <p>.'], solution: '<p>Меня зовут Сергей, и я <strong>очень люблю</strong> игры.</p>\n<p>Сейчас я учу <em>HTML</em>.</p>' },
      { k: 'error', q: 'В какой строке неправильная вложенность?', tokens: ['<p><em>да</em></p>', '<p><strong>нет</p></strong>', '<p>ок<br>ок</p>'], a: 1, why: 'Сначала закрываем внутренний тег: <p><strong>нет</strong></p>.' },
    ],
    quiz: [
      { k: 'choice', q: 'Как браузер покажет 10 пробелов подряд в тексте?', opts: ['Как 10 пробелов', 'Как один пробел', 'Как перенос строки'], a: 1 },
      { k: 'choice', q: 'Какой тег — одиночный?', opts: ['<p>', '<hr>', '<strong>'], a: 1 },
    ],
  },

  {
    id: 'html-05', title: 'Ссылки', goal: 'Делать ссылки на другие сайты, страницы и разделы.',
    theory: [
      { t: 'p', text: 'Ссылка создаётся тегом **<a>** (anchor — «якорь»). Адрес указывается в **атрибуте** `href`.' },
      { t: 'code', lang: 'html', code: '<a href="https://ru.wikipedia.org">Википедия</a>' },
      { t: 'p', text: '**Атрибут** — дополнительная настройка тега: пишется внутри открывающего тега как `имя="значение"`.' },
      { t: 'table', head: ['Вид ссылки', 'Пример href'], rows: [
        ['На другой сайт (абсолютная)', 'https://example.com'], ['На страницу своего сайта (относительная)', 'about.html'],
        ['На раздел этой же страницы', '#contacts (у элемента должен быть id="contacts")'], ['Написать письмо', 'mailto:me@example.com'],
      ] },
      { t: 'p', text: 'Чтобы ссылка открылась в новой вкладке, добавляют `target="_blank"`.' },
      { t: 'tip', text: 'Текст ссылки должен объяснять, куда она ведёт. «Подробнее о курсе» — хорошо, «нажмите здесь» — плохо: это непонятно людям, которые слушают страницу с помощью программ озвучки.' },
    ],
    exercises: [
      { k: 'choice', q: 'В каком атрибуте указывают адрес ссылки?', opts: ['src', 'href', 'link'], a: 1, why: 'href — hypertext reference.' },
      { k: 'html', task: 'Сделайте ссылку на `https://www.python.org` с текстом `Официальный сайт Python`, которая открывается **в новой вкладке**.', starter: '<p>Узнать больше: </p>', checks: [
        { sel: 'a[href]', min: 1, msg: 'Нужна ссылка <a href="...">' }, { sel: 'a', attr: 'href', attrRe: '^https://(www\\.)?python\\.org/?$', msg: 'Адрес должен быть https://www.python.org' },
        { sel: 'a', text: 'Официальный сайт Python', msg: 'Текст ссылки: «Официальный сайт Python»' }, { sel: 'a', attr: 'target', attrRe: '^_blank$', msg: 'Добавьте target="_blank"' },
      ], hints: ['<a href="адрес">текст</a>', 'Атрибуты пишутся через пробел внутри открывающего тега: <a href="..." target="_blank">'], solution: '<p>Узнать больше: <a href="https://www.python.org" target="_blank">Официальный сайт Python</a></p>' },
      { k: 'html', task: 'Сделайте ссылку-якорь: ссылка с текстом `К контактам` ведёт на заголовок `<h2 id="contacts">Контакты</h2>` ниже на странице.', starter: '<a href="">К контактам</a>\n<p>Много текста...</p>\n', checks: [
        { sel: '#contacts', min: 1, msg: 'Нужен элемент с id="contacts"' }, { sel: 'a', attr: 'href', attrRe: '^#contacts$', msg: 'href ссылки должен быть "#contacts"' },
      ], hints: ['href="#contacts" — решётка означает «элемент на этой странице».', 'Ниже добавьте <h2 id="contacts">Контакты</h2>.'], solution: '<a href="#contacts">К контактам</a>\n<p>Много текста...</p>\n<h2 id="contacts">Контакты</h2>' },
    ],
    quiz: [
      { k: 'choice', q: 'Что такое атрибут?', opts: ['Дополнительная настройка тега', 'Закрывающий тег', 'Вид ссылки'], a: 0 },
      { k: 'choice', q: 'Какой текст ссылки лучше?', opts: ['Нажмите здесь', 'Расписание занятий', 'Ссылка'], a: 1 },
    ],
  },

  {
    id: 'html-06', title: 'Изображения', goal: 'Добавлять картинки с правильным описанием.',
    theory: [
      { t: 'p', text: 'Картинка вставляется **одиночным** тегом **<img>** с двумя главными атрибутами:' },
      { t: 'code', lang: 'html', code: '<img src="cat.svg" alt="Рыжий кот спит на подушке" width="200">' },
      { t: 'table', head: ['Атрибут', 'Зачем'], rows: [
        ['src', 'source — адрес файла картинки'], ['alt', 'текстовое описание: показывается, если картинка не загрузилась, и озвучивается для незрячих'],
        ['width / height', 'размер в пикселях (лучше задавать одно, чтобы не исказить пропорции)'],
      ] },
      { t: 'tip', text: 'alt обязателен! Пишите, **что изображено**, а не «картинка» или «фото». Если картинка чисто декоративная, оставьте alt пустым: alt="".' },
      { t: 'p', text: 'В заданиях LingoCode можно использовать встроенные картинки: **cat.svg**, **mountains.svg**, **logo.svg**, **avatar.svg**.' },
      { t: 'p', text: 'Картинку с подписью оформляют тегами **<figure>** и **<figcaption>**:' },
      { t: 'code', lang: 'html', code: '<figure>\n  <img src="mountains.svg" alt="Горы на закате">\n  <figcaption>Алтай, лето</figcaption>\n</figure>' },
    ],
    exercises: [
      { k: 'choice', q: 'В каком атрибуте указывают файл картинки?', opts: ['href', 'src', 'alt'], a: 1, why: 'src — источник.' },
      { k: 'choice', q: 'Какой alt лучше для фото кота на диване?', opts: ['картинка', 'Серый кот лежит на диване', 'img123.jpg'], a: 1, why: 'alt описывает содержимое изображения.' },
      { k: 'html', task: 'Вставьте картинку `cat.svg` шириной **200** пикселей с осмысленным описанием в `alt`.', starter: '<h1>Мой кот</h1>\n', checks: [
        { sel: 'img', min: 1, msg: 'Нужен тег <img>' }, { sel: 'img', attr: 'src', attrRe: 'cat\\.svg$', msg: 'src должен быть "cat.svg"' },
        { sel: 'img', attr: 'alt', attrRe: '\\S{3,}', msg: 'Опишите картинку в alt (хотя бы пару слов)' }, { sel: 'img', attr: 'alt', attrRe: '^(?!картинка$|фото$|image$).*', msg: 'alt «картинка» ничего не объясняет — опишите, что на ней' },
        { sel: 'img', attr: 'width', attrRe: '^200(px)?$', msg: 'Укажите width="200"' },
      ], hints: ['<img src="cat.svg" alt="..." width="200">', '<img> — одиночный тег, закрывать его не нужно.'], solution: '<h1>Мой кот</h1>\n<img src="cat.svg" alt="Рыжий кот улыбается" width="200">' },
      { k: 'html', task: 'Оформите картинку `mountains.svg` с подписью «Мои любимые горы» через `<figure>` и `<figcaption>`.', starter: '', checks: [
        { sel: 'figure img[src$="mountains.svg"]', min: 1, msg: 'Внутри <figure> нужна картинка mountains.svg' }, { sel: 'figure img', attr: 'alt', attrRe: '\\S', msg: 'Не забудьте alt у картинки' },
        { sel: 'figure figcaption', text: 'Мои любимые горы', msg: 'Внутри <figure> нужна подпись <figcaption>Мои любимые горы</figcaption>' },
      ], hints: ['<figure> ... </figure> — обёртка.', 'Внутри — <img ...> и <figcaption>...</figcaption>.'], solution: '<figure>\n  <img src="mountains.svg" alt="Горы и солнце">\n  <figcaption>Мои любимые горы</figcaption>\n</figure>' },
    ],
    quiz: [
      { k: 'choice', q: '<img> — какой тег?', opts: ['Парный', 'Одиночный'], a: 1 },
      { k: 'choice', q: 'Какой alt у чисто декоративной картинки?', opts: ['alt=""', 'alt="декор"', 'alt не нужен совсем'], a: 0 },
    ],
  },

  {
    id: 'html-07', title: 'Списки', goal: 'Создавать маркированные и нумерованные списки.',
    theory: [
      { t: 'p', text: 'В HTML два основных вида списков:' },
      { t: 'table', head: ['Тег', 'Вид', 'Когда'], rows: [['<ul>', 'маркированный (точки)', 'порядок не важен: покупки, навыки'], ['<ol>', 'нумерованный (1, 2, 3)', 'порядок важен: шаги рецепта, рейтинг']] },
      { t: 'p', text: 'Каждый пункт — тег **<li>** (list item). Внутри ul/ol могут быть **только** li.' },
      { t: 'code', lang: 'html', code: '<ul>\n  <li>Хлеб</li>\n  <li>Молоко</li>\n</ul>\n\n<ol>\n  <li>Разбить яйца</li>\n  <li>Взбить</li>\n  <li>Пожарить</li>\n</ol>' },
      { t: 'p', text: 'Списки можно **вкладывать**: внутри <li> можно поместить ещё один <ul> или <ol>.' },
      { t: 'code', lang: 'html', code: '<ul>\n  <li>Фрукты\n    <ul>\n      <li>Яблоки</li>\n      <li>Бананы</li>\n    </ul>\n  </li>\n</ul>' },
    ],
    exercises: [
      { k: 'choice', q: 'Какой список выбрать для шагов инструкции?', opts: ['<ul>', '<ol>'], a: 1, why: 'Порядок важен — нумерованный список.' },
      { k: 'html', task: 'Сделайте **маркированный** список из трёх любимых игр.', starter: '<h2>Мои любимые игры</h2>\n', checks: [{ sel: 'ul', min: 1, msg: 'Нужен <ul>' }, { sel: 'ul > li', min: 3, text: '.', msg: 'Внутри <ul> нужно минимум три <li> с текстом' }], hints: ['<ul> и внутри три <li>Название</li>'], solution: '<h2>Мои любимые игры</h2>\n<ul>\n  <li>Minecraft</li>\n  <li>GTA V</li>\n  <li>The Sims 4</li>\n</ul>' },
      { k: 'html', task: 'Напишите рецепт чая **нумерованным** списком минимум из 3 шагов.', starter: '<h2>Как заварить чай</h2>\n', checks: [{ sel: 'ol > li', min: 3, text: '.', msg: 'Нужен <ol> минимум с тремя пунктами <li>' }, { sel: 'ul', max: 0, msg: 'Здесь нужен именно нумерованный список <ol>, а не <ul>' }], hints: ['<ol> вместо <ul>'], solution: '<h2>Как заварить чай</h2>\n<ol>\n  <li>Вскипятить воду</li>\n  <li>Положить чай в чайник</li>\n  <li>Залить и подождать 3 минуты</li>\n</ol>' },
      { k: 'error', q: 'Что не так в этом списке?', tokens: ['<ul>', '<li>Кофе</li>', '<p>Чай</p>', '</ul>'], a: 2, why: 'Внутри <ul> могут быть только <li>.' },
    ],
    quiz: [
      { k: 'choice', q: 'Как называется тег пункта списка?', opts: ['<item>', '<li>', '<lt>'], a: 1 },
      { k: 'choice', q: 'Что обозначает <ul>?', opts: ['Нумерованный список', 'Маркированный список', 'Таблицу'], a: 1 },
    ],
  },

  {
    id: 'html-08', title: 'Таблицы', goal: 'Делать таблицы с заголовками и строками.',
    theory: [
      { t: 'p', text: 'Таблицы нужны для **табличных данных**: расписаний, цен, результатов.' },
      { t: 'table', head: ['Тег', 'Значение'], rows: [['<table>', 'вся таблица'], ['<tr>', 'строка (table row)'], ['<th>', 'ячейка-заголовок (table header)'], ['<td>', 'обычная ячейка (table data)'], ['<caption>', 'название таблицы']] },
      { t: 'code', lang: 'html', code: '<table>\n  <caption>Расписание</caption>\n  <tr>\n    <th>День</th>\n    <th>Предмет</th>\n  </tr>\n  <tr>\n    <td>Понедельник</td>\n    <td>Английский</td>\n  </tr>\n</table>' },
      { t: 'p', text: 'Для крупных таблиц строки группируют в **<thead>** (шапка) и **<tbody>** (тело). Объединить ячейки можно атрибутами `colspan="2"` и `rowspan="2"`.' },
      { t: 'tip', text: 'Не используйте таблицы для раскладки страницы (колонок, меню). Для этого есть CSS. Таблица — только для данных.' },
    ],
    exercises: [
      { k: 'choice', q: 'Какой тег создаёт строку таблицы?', opts: ['<td>', '<tr>', '<th>'], a: 1, why: 'tr — table row.' },
      { k: 'html', task: 'Сделайте таблицу «Мои оценки»: шапка из двух `<th>` — «Предмет» и «Оценка», и минимум **3 строки** с данными.', starter: '', checks: [
        { sel: 'table', min: 1, msg: 'Нужен <table>' }, { sel: 'table th', min: 2, msg: 'Нужно минимум два заголовка <th>' },
        { sel: 'th', text: 'Предмет', msg: 'Один из <th> — «Предмет»' }, { sel: 'th', text: 'Оценка', msg: 'Один из <th> — «Оценка»' },
        { sel: 'table tr', min: 4, msg: 'Нужно 4 строки <tr>: шапка + 3 с данными' }, { sel: 'table td', min: 6, msg: 'Нужно минимум 6 ячеек <td> (3 строки по 2)' },
      ], hints: ['Первая <tr> содержит два <th>.', 'Дальше три <tr>, в каждой по два <td>.'], solution: '<table>\n  <tr><th>Предмет</th><th>Оценка</th></tr>\n  <tr><td>Английский</td><td>5</td></tr>\n  <tr><td>Python</td><td>5</td></tr>\n  <tr><td>HTML</td><td>4</td></tr>\n</table>' },
    ],
    quiz: [
      { k: 'choice', q: 'Для чего НЕ стоит использовать таблицы?', opts: ['Для расписания', 'Для раскладки страницы на колонки', 'Для списка цен'], a: 1 },
      { k: 'choice', q: 'Что делает colspan="2"?', opts: ['Объединяет две ячейки по горизонтали', 'Создаёт две таблицы', 'Удваивает текст'], a: 0 },
    ],
  },

  {
    id: 'html-09', title: 'Формы и кнопки', goal: 'Создавать формы с полями ввода, подписями и кнопками.',
    theory: [
      { t: 'p', text: '**Форма** собирает данные от пользователя: регистрация, поиск, обратная связь. Создаётся тегом **<form>**.' },
      { t: 'code', lang: 'html', code: '<form>\n  <label for="name">Имя</label>\n  <input type="text" id="name" name="name" required>\n\n  <label for="email">Почта</label>\n  <input type="email" id="email" name="email">\n\n  <button type="submit">Отправить</button>\n</form>' },
      { t: 'table', head: ['type у input', 'Что это'], rows: [['text', 'строка текста'], ['email', 'почта (браузер проверит формат)'], ['password', 'пароль (символы скрыты)'], ['number', 'число'], ['checkbox', 'галочка'], ['radio', 'выбор одного из вариантов'], ['date', 'дата']] },
      { t: 'p', text: '**<label>** — подпись к полю. Атрибут `for` у label должен совпадать с `id` у input: тогда нажатие на подпись ставит курсор в поле. Это удобно и важно для доступности.' },
      { t: 'p', text: 'Для длинного текста есть **<textarea>**, для выпадающего списка — **<select>** с пунктами **<option>**. `required` делает поле обязательным, `placeholder` — показывает пример внутри поля.' },
    ],
    exercises: [
      { k: 'choice', q: 'Какой type подойдёт для пароля?', opts: ['text', 'password', 'secret'], a: 1, why: 'type="password" скрывает символы.' },
      { k: 'html', task: 'Сделайте форму входа: поле **почты** (`type="email"`) и поле **пароля** (`type="password"`), у каждого — свой `<label>`, связанный через `for`/`id`, и кнопка «Войти».', starter: '<form>\n\n</form>', checks: [
        { sel: 'form input[type=email]', min: 1, msg: 'Нужно поле <input type="email">' }, { sel: 'form input[type=password]', min: 1, msg: 'Нужно поле <input type="password">' },
        { sel: 'form label', min: 2, msg: 'Нужно два <label>' }, { labels: true, msg: 'У каждого поля должен быть <label for="..."> с тем же значением, что и id поля' },
        { sel: 'form button, form input[type=submit]', min: 1, text: 'Войти', msg: 'Нужна кнопка «Войти»' },
      ], hints: ['<label for="email">Почта</label> <input type="email" id="email">', 'Значения for и id должны совпадать.', '<button type="submit">Войти</button>'], solution: '<form>\n  <label for="email">Почта</label>\n  <input type="email" id="email" name="email" required>\n  <label for="pass">Пароль</label>\n  <input type="password" id="pass" name="pass" required>\n  <button type="submit">Войти</button>\n</form>' },
      { k: 'html', task: 'Добавьте в форму **выпадающий список** `<select>` «Любимый язык» с вариантами Python, HTML и English.', starter: '<form>\n  <label for="lang">Любимый язык</label>\n\n</form>', checks: [{ sel: 'select#lang', min: 1, msg: 'Нужен <select id="lang">' }, { sel: 'select option', min: 3, msg: 'Нужно минимум три <option>' }], hints: ['<select id="lang"> ... </select>', 'Внутри — <option>Python</option> и т.д.'], solution: '<form>\n  <label for="lang">Любимый язык</label>\n  <select id="lang" name="lang">\n    <option>Python</option>\n    <option>HTML</option>\n    <option>English</option>\n  </select>\n</form>' },
    ],
    quiz: [
      { k: 'choice', q: 'Как связать <label> с полем?', opts: ['for у label = id у input', 'Поставить их рядом', 'name у label = name у input'], a: 0 },
      { k: 'choice', q: 'Что делает атрибут required?', opts: ['Делает поле обязательным', 'Скрывает поле', 'Отправляет форму'], a: 0 },
    ],
  },

  {
    id: 'html-10', title: 'Атрибуты id, class и другие', goal: 'Понимать общие атрибуты и подключать стили.',
    theory: [
      { t: 'p', text: 'Некоторые атрибуты есть у **любого** тега:' },
      { t: 'table', head: ['Атрибут', 'Зачем'], rows: [
        ['id', 'уникальное имя элемента (одно на страницу); нужно для якорей и скриптов'], ['class', 'группа элементов для оформления; можно несколько классов через пробел'],
        ['title', 'всплывающая подсказка при наведении'], ['style', 'стиль прямо в теге (лучше выносить в CSS)'], ['lang', 'язык содержимого элемента'],
      ] },
      { t: 'code', lang: 'html', code: '<p class="note important" title="Подсказка">Важная заметка</p>\n<h2 id="about">Обо мне</h2>\n<p lang="en">Hello!</p>' },
      { t: 'p', text: 'Классы особенно важны для CSS. Простой пример стиля в теге <style> внутри страницы:' },
      { t: 'code', lang: 'html', code: '<style>\n  .note { background: lavender; padding: 8px; }\n</style>\n<p class="note">Я на лавандовом фоне</p>' },
      { t: 'tip', text: 'id должен быть уникальным — двух элементов с id="about" быть не должно. А один класс можно дать хоть сотне элементов.' },
    ],
    exercises: [
      { k: 'choice', q: 'Что должно быть уникальным на странице?', opts: ['class', 'id', 'title'], a: 1, why: 'id — уникальный идентификатор.' },
      { k: 'html', task: 'Сделайте **три** абзаца с классом `card`, а в `<style>` задайте классу `.card` любой фон (`background`).', starter: '<style>\n\n</style>\n', checks: [
        { sel: 'p.card', min: 3, msg: 'Нужно три абзаца <p class="card">' }, { style: '\\.card\\s*\\{[^}]*background', msg: 'В <style> задайте .card { background: ... }' },
      ], hints: ['<p class="card">Текст</p> — три раза.', 'В <style>: .card { background: lavender; }'], solution: '<style>\n  .card { background: lavender; padding: 8px; border-radius: 8px; }\n</style>\n<p class="card">Первая карточка</p>\n<p class="card">Вторая карточка</p>\n<p class="card">Третья карточка</p>' },
      { k: 'html', task: 'Добавьте абзацу подсказку `title="Это подсказка"` и напишите внутри него английскую фразу, указав `lang="en"`.', starter: '<p>Hello, world!</p>', checks: [{ sel: 'p[title="Это подсказка"]', min: 1, msg: 'У абзаца должен быть title="Это подсказка"' }, { sel: 'p[lang=en]', min: 1, msg: 'У абзаца должен быть lang="en"' }], hints: ['<p title="Это подсказка" lang="en">Hello, world!</p>'], solution: '<p title="Это подсказка" lang="en">Hello, world!</p>' },
    ],
    quiz: [
      { k: 'choice', q: 'Как дать элементу два класса?', opts: ['class="a b"', 'class="a" class="b"', 'class="a,b"'], a: 0 },
      { k: 'choice', q: 'Где лучше хранить оформление?', opts: ['В CSS (style или отдельный файл)', 'Только в атрибутах style', 'В тексте'], a: 0 },
    ],
  },

  {
    id: 'html-11', title: 'Семантическая разметка', goal: 'Размечать части страницы по смыслу: header, nav, main, footer.',
    theory: [
      { t: 'p', text: '**Семантика** — значит «смысл». Семантические теги говорят браузеру и поисковикам, *какую роль* играет часть страницы.' },
      { t: 'table', head: ['Тег', 'Роль'], rows: [
        ['<header>', 'шапка: логотип, название'], ['<nav>', 'навигация, меню'], ['<main>', 'главное содержимое (одно на страницу)'],
        ['<section>', 'тематический раздел с заголовком'], ['<article>', 'самостоятельная запись: статья, пост, карточка товара'],
        ['<aside>', 'дополнительное: боковая колонка, примечание'], ['<footer>', 'подвал: контакты, копирайт'],
      ] },
      { t: 'code', lang: 'html', code: '<header>\n  <h1>Блог Лины</h1>\n  <nav>\n    <a href="#posts">Записи</a>\n    <a href="#about">Обо мне</a>\n  </nav>\n</header>\n<main>\n  <article>\n    <h2>Мой первый пост</h2>\n    <p>...</p>\n  </article>\n</main>\n<footer>© 2026</footer>' },
      { t: 'tip', text: 'Тег **<div>** — просто «коробка» без смысла. Его используют для оформления, когда подходящего семантического тега нет.' },
    ],
    exercises: [
      { k: 'choice', q: 'Какой тег для меню сайта?', opts: ['<menu-bar>', '<nav>', '<header>'], a: 1, why: 'nav — navigation.' },
      { k: 'html', task: 'Сделайте каркас страницы: `<header>` с `<h1>` и `<nav>` (минимум 2 ссылки), `<main>` хотя бы с одной `<section>` и `<footer>`.', starter: '', checks: [
        { sel: 'header h1', min: 1, msg: 'В <header> нужен <h1>' }, { sel: 'nav a', min: 2, msg: 'В <nav> нужно минимум две ссылки' },
        { sel: 'main', min: 1, max: 1, msg: 'Нужен ровно один <main>' }, { sel: 'main section', min: 1, msg: 'В <main> нужна <section>' }, { sel: 'footer', min: 1, msg: 'Нужен <footer>' },
      ], hints: ['Посмотрите пример в теории.', 'nav можно поместить внутрь header.'], solution: '<header>\n  <h1>Мой сайт</h1>\n  <nav>\n    <a href="#games">Игры</a>\n    <a href="#about">Обо мне</a>\n  </nav>\n</header>\n<main>\n  <section id="games">\n    <h2>Игры</h2>\n    <p>Мои любимые игры.</p>\n  </section>\n</main>\n<footer>© 2026</footer>' },
    ],
    quiz: [
      { k: 'choice', q: 'Сколько <main> должно быть на странице?', opts: ['Один', 'Сколько угодно', 'Ни одного'], a: 0 },
      { k: 'choice', q: 'Для чего <article>?', opts: ['Для самостоятельной записи: статья, пост', 'Для меню', 'Для подвала'], a: 0 },
    ],
  },

  {
    id: 'html-12', title: 'Доступность страниц', goal: 'Делать страницы удобными для всех, включая людей с нарушениями зрения.',
    theory: [
      { t: 'p', text: '**Доступность** (accessibility, a11y) — это когда сайтом могут пользоваться все: незрячие (через программы озвучки), люди, управляющие только клавиатурой, пожилые пользователи с плохим зрением.' },
      { t: 'p', text: 'Главные правила, которые вы уже знаете:\n• у каждой картинки есть осмысленный **alt**\n• у каждого поля формы — **label**\n• заголовки идут по порядку: **h1 → h2 → h3**\n• у страницы указан язык: **<html lang="ru">**\n• текст ссылок понятен без контекста\n• используются семантические теги и **<button>** для кнопок' },
      { t: 'tip', text: 'Не делайте кнопку из <div> или <span>: такую «кнопку» нельзя нажать с клавиатуры, и программа озвучки не поймёт, что это кнопка. Используйте <button>.' },
      { t: 'p', text: 'Если у элемента нет видимого текста (например, кнопка с иконкой), опишите его атрибутом **aria-label**:' },
      { t: 'code', lang: 'html', code: '<button aria-label="Закрыть">✕</button>' },
    ],
    exercises: [
      { k: 'choice', q: 'Чем плох <div onclick="..."> вместо кнопки?', opts: ['Его нельзя нажать с клавиатуры и озвучка не понимает, что это кнопка', 'Ничем', 'Он медленнее'], a: 0, why: 'Используйте <button>.' },
      { k: 'html', task: 'Исправьте страницу, чтобы она стала доступной: добавьте `alt` картинке, `label` полю поиска и `aria-label` кнопке с иконкой.', starter: '<img src="logo.svg">\n<form>\n  <input type="search" id="q">\n  <button>🔍</button>\n</form>', checks: [
        { sel: 'img', attr: 'alt', attrRe: '\\S', msg: 'У картинки нет alt' }, { labels: true, msg: 'У поля поиска нет связанного <label for="q">' },
        { sel: 'label', min: 1, msg: 'Добавьте <label> для поля поиска' }, { sel: 'button', attr: 'aria-label', attrRe: '\\S', msg: 'У кнопки-иконки нет aria-label' },
      ], hints: ['<img src="logo.svg" alt="Логотип LingoCode">', '<label for="q">Поиск</label>', '<button aria-label="Найти">🔍</button>'], solution: '<img src="logo.svg" alt="Логотип LingoCode">\n<form>\n  <label for="q">Поиск по сайту</label>\n  <input type="search" id="q">\n  <button aria-label="Найти">🔍</button>\n</form>' },
    ],
    quiz: [
      { k: 'choice', q: 'Что такое aria-label?', opts: ['Текстовое описание для элемента без видимого текста', 'Новый тег', 'Тип ссылки'], a: 0 },
      { k: 'choice', q: 'Что нарушает доступность?', opts: ['Картинка без alt', 'Заголовки по порядку', 'Указанный lang'], a: 0 },
    ],
  },
];

export const htmlProjects = [
  {
    id: 'htmlp-first', project: true, after: 'html-04', title: 'Проект: первая веб-страница', goal: 'Собрать полноценную страницу с каркасом, заголовками и абзацами.',
    theory: [{ t: 'p', text: 'Соберите свою первую настоящую страницу на любую тему (хобби, игра, город). Требования:\n• полный каркас: doctype, html с lang, head с charset и title\n• один h1 и минимум два раздела h2\n• под каждым h2 — хотя бы один абзац\n• где-нибудь выделите важное через strong' }],
    exercises: [{ k: 'html', task: 'Сделайте первую веб-страницу по требованиям из описания.', starter: '<!DOCTYPE html>\n<html lang="ru">\n  <head>\n    <meta charset="UTF-8">\n    <title></title>\n  </head>\n  <body>\n\n  </body>\n</html>', src: [{ re: '<!doctype html>', msg: 'Нужен <!DOCTYPE html>' }], checks: [
      { sel: 'html[lang]', min: 1, msg: 'Укажите lang у <html>' }, { sel: 'meta[charset]', min: 1, msg: 'Нужен <meta charset>' }, { sel: 'title', text: '.', msg: 'Заполните <title>' },
      { sel: 'body h1', min: 1, max: 1, text: '.', msg: 'Нужен один <h1> с текстом' }, { sel: 'body h2', min: 2, msg: 'Нужно минимум два <h2>' }, { sel: 'body p', min: 2, msg: 'Нужно минимум два абзаца' }, { sel: 'strong', min: 1, msg: 'Выделите что-то тегом <strong>' },
    ], hints: ['Начните с заполнения <title>.', 'В <body>: <h1>, затем <h2> + <p>, ещё <h2> + <p>.'], solution: '<!DOCTYPE html>\n<html lang="ru">\n  <head>\n    <meta charset="UTF-8">\n    <title>Мой канал</title>\n  </head>\n  <body>\n    <h1>Мой игровой канал</h1>\n    <h2>О чём канал</h2>\n    <p>Я снимаю <strong>геймплей</strong> разных игр.</p>\n    <h2>Расписание</h2>\n    <p>Новые шортсы каждый день.</p>\n  </body>\n</html>' }],
    quiz: [],
  },
  {
    id: 'htmlp-about', project: true, after: 'html-07', title: 'Проект: страница о себе', goal: 'Рассказать о себе с картинкой, ссылками и списками.',
    theory: [{ t: 'p', text: 'Сделайте страницу «Обо мне». Требования:\n• h1 с вашим именем или ником\n• картинка (например, avatar.svg) с осмысленным alt\n• абзац о себе\n• маркированный список увлечений (минимум 3)\n• нумерованный список целей на год (минимум 2)\n• хотя бы одна ссылка' }],
    exercises: [{ k: 'html', task: 'Сделайте страницу «Обо мне» по требованиям.', starter: '<h1></h1>\n', checks: [
      { sel: 'h1', text: '.', msg: 'Нужен <h1> с именем' }, { sel: 'img', attr: 'alt', attrRe: '\\S{3,}', msg: 'Нужна картинка с осмысленным alt' }, { sel: 'p', min: 1, text: '.', msg: 'Нужен абзац о себе' },
      { sel: 'ul > li', min: 3, msg: 'Нужен <ul> минимум с тремя увлечениями' }, { sel: 'ol > li', min: 2, msg: 'Нужен <ol> минимум с двумя целями' }, { sel: 'a[href]', min: 1, msg: 'Добавьте хотя бы одну ссылку' },
    ], hints: ['<img src="avatar.svg" alt="Мой аватар">', 'Списки: <ul><li>…</li></ul> и <ol><li>…</li></ol>'], solution: '<h1>LUNEXA</h1>\n<img src="avatar.svg" alt="Аватар канала LUNEXA" width="120">\n<p>Я делаю игровые видео и учусь программировать.</p>\n<h2>Увлечения</h2>\n<ul>\n  <li>Игры</li>\n  <li>Монтаж</li>\n  <li>Программирование</li>\n</ul>\n<h2>Цели на год</h2>\n<ol>\n  <li>Выучить Python</li>\n  <li>Сделать свой сайт</li>\n</ol>\n<a href="https://www.youtube.com">Мой канал</a>' }],
    quiz: [],
  },
  {
    id: 'htmlp-card', project: true, after: 'html-11', title: 'Проект: личная визитка', goal: 'Сверстать аккуратную визитку с семантикой и стилями.',
    theory: [{ t: 'p', text: 'Сделайте сайт-визитку. Требования:\n• header с h1 и nav (минимум 2 ссылки-якоря на разделы)\n• main минимум с двумя section, у каждой есть id и h2\n• в одном разделе — таблица или список контактов\n• footer\n• блок <style>, где оформлены хотя бы 2 правила (например, body и header)' }],
    exercises: [{ k: 'html', task: 'Сверстайте личную визитку по требованиям.', starter: '<style>\n  body { font-family: sans-serif; }\n</style>\n', checks: [
      { sel: 'header h1', min: 1, msg: 'В <header> нужен <h1>' }, { sel: 'nav a[href^="#"]', min: 2, msg: 'В <nav> нужно минимум две ссылки-якоря (href="#...")' },
      { sel: 'main section[id]', min: 2, msg: 'В <main> нужно минимум две <section> с id' }, { sel: 'main section h2', min: 2, msg: 'У каждой секции должен быть <h2>' },
      { anchors: true, msg: 'Ссылки в меню должны вести на существующие id секций' }, { sel: 'main table, main ul, main ol', min: 1, msg: 'Добавьте список или таблицу контактов' },
      { sel: 'footer', min: 1, msg: 'Нужен <footer>' }, { style: '\\{[^}]*\\}[\\s\\S]*\\{[^}]*\\}', msg: 'В <style> нужно минимум два правила' },
    ], hints: ['<nav><a href="#about">Обо мне</a> <a href="#contacts">Контакты</a></nav>', '<section id="about"><h2>Обо мне</h2>...</section>'], solution: '<style>\n  body { font-family: sans-serif; margin: 0; background: #F8F7FF; }\n  header { background: #8B5CF6; color: white; padding: 16px; }\n  nav a { color: white; margin-right: 12px; }\n  section { padding: 16px; }\n</style>\n<header>\n  <h1>Сергей</h1>\n  <nav>\n    <a href="#about">Обо мне</a>\n    <a href="#contacts">Контакты</a>\n  </nav>\n</header>\n<main>\n  <section id="about">\n    <h2>Обо мне</h2>\n    <p>Создатель игрового канала LUNEXA.</p>\n  </section>\n  <section id="contacts">\n    <h2>Контакты</h2>\n    <ul>\n      <li>YouTube: LUNEXA</li>\n      <li>GitHub: Falsif</li>\n    </ul>\n  </section>\n</main>\n<footer>© 2026</footer>' }],
    quiz: [],
  },
];
