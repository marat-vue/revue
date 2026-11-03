import LZString from "lz-string";

/**
 * Открывает файлы проекта на codesandbox.io через Define API (так же делала кнопка Sandpack):
 * POST-форма с параметрами, сжатыми lz-string, в новой вкладке.
 */
export function openInCodeSandbox(files: Record<string, string>, environment: string) {
  const payload: Record<string, { content: string; isBinary: boolean }> = {};
  for (const [path, code] of Object.entries(files)) payload[path.replace(/^\//, "")] = { content: code, isBinary: false };
  if (!payload["sandbox.config.json"]) {
    payload["sandbox.config.json"] = { content: JSON.stringify({ template: environment }), isBinary: false };
  }
  const parameters = LZString.compressToBase64(JSON.stringify({ files: payload }))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const form = document.createElement("form");
  form.method = "POST";
  form.action = "https://codesandbox.io/api/v1/sandboxes/define";
  form.target = "_blank";
  for (const [name, value] of [
    ["parameters", parameters],
    ["query", `file=/${Object.keys(payload)[0] ?? ""}&utm_medium=sandpack`],
  ]) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name!;
    input.value = value!;
    form.appendChild(input);
  }
  document.body.appendChild(form);
  form.submit();
  form.remove();
}
