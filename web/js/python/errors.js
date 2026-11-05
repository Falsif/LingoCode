// Понятные объяснения ошибок Python на русском языке
const S = (re, text) => ({ re, text });

const RULES = {
  SyntaxError: [
    S(/unterminated string literal|EOL while scanning/, 'Не закрыта кавычка. У каждой строки должны быть открывающая и закрывающая кавычки одного вида: "текст" или \'текст\'.'),
    S(/unterminated triple-quoted/, 'Не закрыты тройные кавычки """.'),
    S(/'\(' was never closed|unexpected EOF|was never closed/, 'Не закрыта скобка. Посчитайте: сколько открывающих скобок, столько должно быть и закрывающих.'),
    S(/unmatched '\)'|unmatched/, 'Лишняя закрывающая скобка — для неё нет открывающей пары.'),
    S(/expected ':'/, 'Пропущено двоеточие. После if, elif, else, for, while, def и class обязательно ставится «:».'),
    S(/invalid character/, 'В коде недопустимый символ. Частая причина — «ёлочки» вместо обычных кавычек, русская запятая или буква вместо латинской в имени команды.'),
    S(/cannot assign to (literal|expression|function call)/, 'Слева от = должно быть имя переменной. Возможно, вы хотели сравнить и забыли второе «=»: ==.'),
    S(/invalid syntax\. Maybe you meant '==' or ':='/, 'Внутри условия используется «=». Для сравнения нужно «==».'),
    S(/invalid decimal literal/, 'Имя не может начинаться с цифры, а между числом и словом нужен знак операции.'),
    S(/Missing parentheses in call to 'print'/, 'В Python 3 print пишется со скобками: print("текст").'),
    S(/'return' outside function/, 'return можно использовать только внутри функции (после def).'),
    S(/'break' outside loop|'continue' not properly in loop/, 'break и continue работают только внутри цикла for или while.'),
    S(/invalid syntax/, 'Python не понял запись строки. Проверьте кавычки, скобки, двоеточия и знаки операций.'),
  ],
  IndentationError: [
    S(/expected an indented block/, 'После строки с двоеточием нужен отступ. Сдвиньте следующую строку на 4 пробела вправо.'),
    S(/unexpected indent/, 'Лишний отступ. Эта строка не должна быть сдвинута вправо.'),
    S(/unindent does not match/, 'Отступы не совпадают. Строки одного блока должны начинаться с одинакового числа пробелов.'),
  ],
  TabError: [S(/./, 'Смешаны табы и пробелы в отступах. Используйте только пробелы (по 4).')],
  NameError: [
    S(/name '(.+?)' is not defined/, (m) => `Python не знает имени «${m[1]}». Возможные причины: опечатка (важен регистр букв), переменная ещё не создана, или текст забыли взять в кавычки.`),
  ],
  TypeError: [
    S(/can only concatenate str \(not "(\w+)"\) to str/, (m) => `Нельзя сложить строку и ${m[1] === 'int' ? 'число' : m[1]}. Преобразуйте значение: str(значение), или используйте f-строку f"...{x}...".`),
    S(/unsupported operand type\(s\) for (.+?): '(\w+)' and '(\w+)'/, (m) => `Операция «${m[1]}» не работает между типами ${m[2]} и ${m[3]}. Часто это значит, что число пришло из input() строкой — оберните его в int().`),
    S(/'(<|>|<=|>=)' not supported between instances of '(\w+)' and '(\w+)'/, (m) => `Нельзя сравнить ${m[2]} и ${m[3]}. Скорее всего, нужно превратить строку из input() в число через int().`),
    S(/'(\w+)' object is not callable/, (m) => `Объект типа ${m[1]} нельзя вызвать как функцию. Возможно, вы назвали переменную так же, как функцию (например, print = 5), или поставили лишние скобки.`),
    S(/missing (\d+) required positional argument/, 'Функции передано меньше значений, чем она ожидает. Проверьте, сколько параметров указано в def.'),
    S(/takes (\d+) positional arguments? but (\d+) (were|was) given/, (m) => `Функция принимает ${m[1]} аргумент(а), а передано ${m[2]}.`),
    S(/'(\w+)' object is not subscriptable/, (m) => `У значения типа ${m[1]} нельзя взять элемент по индексу [ ].`),
    S(/object of type '(\w+)' has no len/, (m) => `У значения типа ${m[1]} нет длины, len() к нему не применить.`),
    S(/'(\w+)' object is not iterable/, (m) => `По значению типа ${m[1]} нельзя пройти циклом. Для чисел используйте range().`),
  ],
  ValueError: [
    S(/invalid literal for int\(\) with base 10: '(.*)'/, (m) => `int() не может превратить «${m[1]}» в целое число. Проверьте ввод: нужны только цифры (без пробелов, точек и букв).`),
    S(/could not convert string to float: '(.*)'/, (m) => `float() не может превратить «${m[1]}» в число. Дробную часть отделяют точкой: 3.5.`),
    S(/list.remove\(x\): x not in list/, 'remove() не нашёл такой элемент в списке. Сначала проверьте: if x in список.'),
    S(/not enough values to unpack|too many values to unpack/, 'Количество переменных слева не совпадает с количеством значений справа.'),
  ],
  ZeroDivisionError: [S(/./, 'Деление на ноль. Перед делением проверьте, что делитель не равен 0.')],
  IndexError: [S(/out of range/, 'Элемента с таким номером нет. Помните: нумерация начинается с 0, а последний индекс равен len(список) - 1.')],
  KeyError: [S(/(.*)/, (m) => `В словаре нет ключа ${m[1]}. Проверьте написание или используйте безопасный способ: словарь.get(ключ, значение_по_умолчанию).`)],
  AttributeError: [
    S(/'(\w+)' object has no attribute '(\w+)'/, (m) => `У значения типа ${m[1]} нет метода или свойства «${m[2]}». Проверьте написание.${m[2] === 'push' ? ' Для списков в Python используется append().' : ''}`),
  ],
  EOFError: [S(/LC_NO_INPUT|EOF/, 'Программа вызвала input(), но вводить больше нечего. Добавьте данные в поле «Ввод» — каждая строка соответствует одному input().')],
  RecursionError: [S(/./, 'Функция вызывает сама себя слишком много раз. Проверьте условие остановки рекурсии.')],
  MemoryError: [S(/./, 'Программе не хватило памяти. Возможно, создаётся слишком большой список.')],
  ModuleNotFoundError: [S(/No module named '(.+?)'/, (m) => `Модуль «${m[1]}» недоступен. В песочнице есть стандартная библиотека Python без доступа к сети.`), S(/import of (.+?) halted/, (m) => `Модуль «${m[1]}» отключён в песочнице ради безопасности.`)],
  ImportError: [S(/./, 'Этот модуль нельзя загрузить в безопасной песочнице.')],
  UnboundLocalError: [S(/./, 'Переменная используется внутри функции раньше, чем ей присвоено значение.')],
  OverflowError: [S(/./, 'Число получилось слишком большим для этой операции.')],
};

const TITLES = {
  SyntaxError: 'Ошибка записи кода', IndentationError: 'Ошибка отступов', TabError: 'Ошибка отступов', NameError: 'Неизвестное имя',
  TypeError: 'Несовместимые типы', ValueError: 'Неподходящее значение', ZeroDivisionError: 'Деление на ноль', IndexError: 'Неверный индекс',
  KeyError: 'Нет такого ключа', AttributeError: 'Нет такого метода', EOFError: 'Не хватило ввода', RecursionError: 'Слишком глубокая рекурсия',
  MemoryError: 'Не хватило памяти', ModuleNotFoundError: 'Модуль недоступен', ImportError: 'Модуль недоступен',
};

export function explainError(err) {
  if (!err) return null;
  const rules = RULES[err.type] || [];
  let text = '';
  for (const r of rules) {
    const m = String(err.msg || '').match(r.re);
    if (m) { text = typeof r.text === 'function' ? r.text(m) : r.text; break; }
  }
  if (!text) text = 'Во время работы программы произошла ошибка. Прочитайте сообщение Python ниже и проверьте указанную строку.';
  const where = err.file === 'pre.py' || err.file === 'check.py' ? null : err.line;
  return { title: TITLES[err.type] || err.type, text, line: where, raw: `${err.type}: ${String(err.msg || '').replace('LC_NO_INPUT', 'нет данных для input()')}` };
}
