// @ts-nocheck -- TypeScript models JSON with export=; this case exercises ECMAScript namespace re-exports.
export * as root from "./root";
export { default as data } from "./data.json" with { type: "json" };
export * as json from "./data.json" with { type: "json" };
export let value = 17;
export function increment() { value++; }
