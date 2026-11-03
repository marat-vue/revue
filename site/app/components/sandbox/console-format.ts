/**
 * Форматирование сообщений консоли из iframe песочницы. Бандлер CodeSandbox сериализует значения
 * (функции, Map, Date, циклические ссылки) в объекты с ключами "@t" / "@r" — здесь они превращаются
 * обратно в читаемый текст, как это делала SandpackConsole.
 */

const TYPE_KEY = "@t";
const TYPE_KEY_ALT = "#@t";
const CIRCULAR_KEY = "@r";
const MAX_LENGTH = 10_000;
const MAX_NEST = 2;
const MAX_KEYS = 6;

export interface ConsoleLog {
  id: string;
  method: string;
  data: unknown[];
}

function restore(message: unknown): unknown {
  if (message === null || typeof message !== "object") return message;
  if (Array.isArray(message)) return message.map(restore);
  const m = message as Record<string, unknown>;
  const type = (m[TYPE_KEY] ?? m[TYPE_KEY_ALT]) as string | undefined;
  if (!type) return message;
  const data = m.data as Record<string, unknown> & unknown[];
  switch (type) {
    case "Arithmetic":
      return ([Infinity, -Infinity, -0] as number[])[data as unknown as number] ?? data;
    case "Function":
      return { __fn: `function ${data.name ?? ""}() {${data.body ?? ""}}` };
    case "[[NaN]]":
      return NaN;
    case "[[undefined]]":
      return undefined;
    case "[[Date]]":
      return new Date(data as unknown as number);
    case "[[RegExp]]":
      return new RegExp(String(data.src), String(data.flags));
    case "[[Error]]":
      return { __text: `${data.name}: ${data.message}` };
    case "[[Map]]": {
      const map = new Map();
      for (let i = 0; i < data.length; i += 2) map.set(restore(data[i]), restore(data[i + 1]));
      return map;
    }
    case "[[Set]]":
      return new Set((data as unknown[]).map(restore));
    case "HTMLElement":
      return { __text: `<${String(data.tagName).toLowerCase()}>${String(data.innerHTML ?? "").slice(0, 200)}</${String(data.tagName).toLowerCase()}>` };
    default:
      return data;
  }
}

function toText(value: unknown, refs: unknown[], level: number, top = false): string {
  try {
    const v = restore(value);
    if (Array.isArray(v)) return `[${v.map((x) => toText(x, refs, level + 1)).join(", ")}]`;
    switch (typeof v) {
      case "string":
        // строки верхнего уровня печатаются как есть, вложенные — в кавычках
        return (top ? v : `"${v}"`).slice(0, MAX_LENGTH);
      case "number":
      case "boolean":
      case "bigint":
      case "symbol":
        return String(v);
      case "undefined":
        return "undefined";
      default: {
        if (v === null) return "null";
        if (v instanceof RegExp || v instanceof Date) return v.toString();
        if (v instanceof Map) return `Map(${v.size}) {${[...v].map(([k, x]) => `${toText(k, refs, level + 1)} => ${toText(x, refs, level + 1)}`).join(", ")}}`;
        if (v instanceof Set) return `Set(${v.size}) {${[...v].map((x) => toText(x, refs, level + 1)).join(", ")}}`;
        const o = v as Record<string, unknown>;
        if ("__fn" in o) return String(o.__fn);
        if ("__text" in o) return String(o.__text);
        if (CIRCULAR_KEY in o) {
          if (level > MAX_NEST) return "Unable to print information";
          return toText(refs[o[CIRCULAR_KEY] as number], refs, level + 1);
        }
        const entries = Object.entries(o);
        if (!entries.length) return "{}";
        if (level > MAX_NEST) return "{…}";
        const br = entries.length > 10 ? "\n  " : "";
        const body = entries
          .slice(0, MAX_KEYS + 1)
          .map(([k, x], i) => (i === MAX_KEYS ? `${br}...` : `${br}${k}: ${toText(x, refs, level + 1)}`))
          .join(", ");
        return `{ ${body}${entries.length > 10 ? "\n" : " "}}`;
      }
    }
  } catch {
    return "Unable to print information";
  }
}

export function formatConsoleValue(value: unknown, refs: unknown[]) {
  return toText(value, refs, 0, true);
}

const SYNTAX_ERROR_PATTERN = ["SyntaxError: ", "Error in sandbox:"];

/** Убирает служебные сообщения бандлера о синтаксических ошибках — они видны в превью. */
export function withoutSyntaxErrors(logs: ConsoleLog[]) {
  return logs.filter((l) => {
    const data = Array.isArray(l.data) ? l.data : [];
    return data.filter((d) => typeof d !== "string" || !SYNTAX_ERROR_PATTERN.some((p) => d.startsWith(p))).length > 0;
  });
}
