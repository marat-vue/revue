import assert from "node:assert/strict";
import test from "node:test";
import { STARTERS, exampleStarter, isSandboxTemplate, templateBase } from "../app/components/sandbox/starters.ts";
import { SANDBOX_LANGS } from "../app/utils/sandbox-shared.ts";

test("sandbox offers the supported projects without React templates", () => {
  assert.deepEqual(STARTERS.map((s) => s.id), ["html", "js", "ts", "vue", "canvas", "tests"]);
  assert.equal(isSandboxTemplate("react-ts"), false);
  assert.equal(SANDBOX_LANGS.has("tsx"), false);
  assert.equal(SANDBOX_LANGS.has("jsx"), false);
  for (const starter of STARTERS) {
    assert.ok(starter.activeFile in starter.files);
    assert.ok(isSandboxTemplate(starter.template));
    const pkg = JSON.parse(starter.files["/package.json"]);
    assert.ok(!("react" in (pkg.dependencies ?? {})));
    assert.ok(!JSON.stringify(templateBase(starter.template)).includes("react-jsx"));
  }
});

test("lesson snippets still select HTML, JavaScript, TypeScript and Vue", () => {
  for (const [lang, code, expected] of [
    ["html", "<h1>Привет</h1>", "static"],
    ["javascript", "console.log(1)", "vanilla"],
    ["typescript", "const count: number = 1", "vanilla-ts"],
    ["vue", "<template><h1>Привет</h1></template>", "vue-ts"],
  ]) {
    const project = exampleStarter([{ lang, code }]);
    assert.equal(project.template, expected);
    assert.ok(project.activeFile in project.files);
  }
});

test("legacy JSX snippets fail safely instead of launching a removed template", () => {
  for (const lang of ["jsx", "tsx", "TSX"]) assert.throws(() => exampleStarter([{ lang, code: "export default () => <h1 />" }]));
});

test("Vue tests from lessons retain their component and test dependencies", () => {
  const project = exampleStarter([
    { lang: "vue", file: "Counter.vue", code: "<template><button>0</button></template>" },
    { lang: "ts", file: "Counter.test.ts", code: 'import { render, screen } from "@testing-library/vue";\ntest("counter", () => { expect(screen).toBeTruthy(); });' },
  ]);
  assert.equal(project.template, "vue-ts");
  assert.equal(project.mode, "tests");
  assert.ok("/src/Counter.vue" in project.files);
  assert.ok(JSON.parse(project.files["/package.json"]).dependencies["@testing-library/vue"]);
});
