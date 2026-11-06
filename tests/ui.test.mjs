import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
const css=readFileSync(new URL("../src/styles.css",import.meta.url),"utf8");

test("the default modal and toast are hidden at boot",()=>{
  assert.match(html,/<div class="veil"[^>]*\bhidden\b/);
  assert.match(html,/<div class="toast"[^>]*\bhidden\b/);
  assert.match(html,/<aside class="panel"[^>]*\bhidden\b/);
  // UA hidden can be overridden by our author-level .veil { display:grid }.
  assert.match(css,/\[hidden\][^{]*\{[^}]*display:\s*none\s*!important/i);
});
test("browser entry and assets use Pages-compatible relative URLs",()=>{
  assert.match(html, /src="\.\/src\/main\.js"/);
  assert.match(html, /href="\.\/src\/styles\.css"/);
});
