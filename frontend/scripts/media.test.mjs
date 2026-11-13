import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);
function load(name) {
  const path = new URL(`../src/ui/${name}`, import.meta.url);
  const source = readFileSync(path, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const module = { exports: {} };
  const localRequire = (id) => {
    if (id === "./icon") return load("icon.tsx");
    if (id === "./props") return load("props.ts");
    if (id === "./imagery") return load("imagery.ts");
    return require(id);
  };
  new Function("require", "module", "exports", compiled)(localRequire, module, module.exports);
  return module.exports;
}

const { RemoteImage } = load("Media.tsx");
const render = (props) => renderToStaticMarkup(React.createElement(RemoteImage, props));
assert.match(render({ src: "https://example.com/car.jpg", alt: "car", representative: true }), /Representative image — not the actual item/);
assert.match(render({ src: "https://example.com/car.jpg", alt: "car", representative: true, representativeNote: "Vehicle" }), /Vehicle/);
assert.doesNotMatch(render({ src: "https://example.com/car.jpg", alt: "car" }), /media-representative/);
const missing = render({ src: null, alt: "car", representative: true, icon: "car" });
assert.match(missing, /Image unavailable/);
assert.match(missing, /media-mark/);
assert.doesNotMatch(missing, /media-representative|<img/);
console.log("RemoteImage representative and placeholder states passed");
