import direct from "./data.json" with { type: "json" };
import { default as alias } from "./data.json" with { type: "json" };
import * as namespace from "./data.json" with { type: "json" };

const namespaceValue: any = namespace;

console.log(direct === alias, alias === namespaceValue.default);
console.log(direct.name, direct.nested[0], direct.nested[1], direct.nested[2] === null);
console.log(
    Object.getPrototypeOf(direct) === Object.prototype,
    Object.hasOwn(direct, "__proto__"),
    direct.__proto__.safe,
);
direct.name = "mutated";
console.log(alias.name, namespaceValue.default.name);
console.log(Object.keys(namespace).join(","), Object.getPrototypeOf(namespace) === null, Object.isExtensible(namespace));
console.log(Object.getOwnPropertyNames(namespace).length, namespaceValue.default === direct);
