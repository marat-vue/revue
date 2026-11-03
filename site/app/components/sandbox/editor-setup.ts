import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap } from "@codemirror/autocomplete";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { javascript } from "@codemirror/lang-javascript";
import { vue } from "@codemirror/lang-vue";
import { bracketMatching, HighlightStyle, indentOnInput, syntaxHighlighting } from "@codemirror/language";
import { highlightSelectionMatches, searchKeymap } from "@codemirror/search";
import { StateEffect, StateField, type Extension } from "@codemirror/state";
import { Decoration, drawSelection, EditorView, highlightActiveLine, highlightActiveLineGutter, keymap, lineNumbers, type DecorationSet } from "@codemirror/view";
import { tags as t } from "@lezer/highlight";

/** Подсветка синтаксиса — палитры One Light / One Dark, как в уроках (Shiki). */
const PALETTES = {
  light: {
    plain: "#383a42",
    comment: "#a0a1a7",
    keyword: "#a626a4",
    definition: "#4078f2",
    property: "#e45649",
    tag: "#e45649",
    static: "#986801",
    string: "#50a14f",
  },
  dark: {
    plain: "#abb2bf",
    comment: "#7f848e",
    keyword: "#c678dd",
    definition: "#61afef",
    property: "#e06c75",
    tag: "#e06c75",
    static: "#d19a66",
    string: "#98c379",
  },
};

export function highlighting(mode: "light" | "dark"): Extension {
  const p = PALETTES[mode];
  return syntaxHighlighting(
    HighlightStyle.define([
      { tag: [t.comment, t.lineComment, t.blockComment, t.docComment], color: p.comment, fontStyle: "italic" },
      { tag: [t.keyword, t.controlKeyword, t.moduleKeyword, t.operatorKeyword, t.definitionKeyword, t.modifier, t.self], color: p.keyword },
      { tag: [t.function(t.variableName), t.function(t.propertyName), t.definition(t.function(t.variableName)), t.className, t.typeName], color: p.definition },
      { tag: [t.propertyName, t.attributeName], color: p.property },
      { tag: [t.tagName, t.angleBracket], color: p.tag },
      { tag: [t.number, t.bool, t.null, t.atom, t.unit, t.constant(t.variableName)], color: p.static },
      { tag: [t.string, t.special(t.string), t.regexp, t.attributeValue], color: p.string },
      { tag: [t.punctuation, t.operator, t.bracket], color: p.plain },
      { tag: t.invalid, color: p.property },
    ]),
  );
}

export function language(path: string): Extension {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  switch (ext) {
    case "js":
    case "mjs":
    case "cjs":
      return javascript();
    case "jsx":
      return javascript({ jsx: true });
    case "ts":
      return javascript({ typescript: true });
    case "tsx":
      return javascript({ jsx: true, typescript: true });
    case "html":
      return html();
    case "css":
      return css();
    case "vue":
      return vue();
    case "json":
      return javascript();
    default:
      return [];
  }
}

/* ───────────── строка с ошибкой компиляции ───────────── */

export const setErrorLine = StateEffect.define<{ line: number; message: string } | null>();

const errorLine = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(deco, tr) {
    deco = deco.map(tr.changes);
    for (const e of tr.effects) {
      if (!e.is(setErrorLine)) continue;
      if (!e.value || e.value.line < 1 || e.value.line > tr.state.doc.lines) {
        deco = Decoration.none;
        continue;
      }
      const line = tr.state.doc.line(e.value.line);
      deco = Decoration.set([Decoration.line({ class: "cm-errorLine", attributes: { title: e.value.message } }).range(line.from)]);
    }
    return deco;
  },
  provide: (f) => EditorView.decorations.from(f),
});

const errorTheme = EditorView.baseTheme({
  ".cm-errorLine": {
    backgroundColor: "color-mix(in oklch, var(--foreground) 10%, transparent)",
    textDecoration: "underline wavy var(--muted-foreground)",
  },
});

/** Базовый набор: номера строк, история, автодополнение, скобки, поиск. */
export function baseExtensions(readOnly = false): Extension[] {
  return [
    lineNumbers(),
    highlightActiveLineGutter(),
    history(),
    drawSelection(),
    indentOnInput(),
    bracketMatching(),
    closeBrackets(),
    autocompletion(),
    highlightActiveLine(),
    highlightSelectionMatches(),
    errorLine,
    errorTheme,
    EditorView.editable.of(!readOnly),
    keymap.of([...closeBracketsKeymap, ...defaultKeymap, ...searchKeymap, ...historyKeymap, ...completionKeymap, indentWithTab]),
  ];
}
