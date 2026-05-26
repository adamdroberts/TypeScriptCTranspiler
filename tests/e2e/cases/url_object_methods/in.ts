const u = new URL("https://example.com:8443/a/b?x=1#frag");
let seen = "";

function mark(label: string): string {
  seen += label;
  return label;
}

console.log("toString:", u.toString());
console.log("locale:", u.toLocaleString());
console.log("json:", u.toJSON());
console.log("concat:", "url=" + u);
console.log("value:", u.valueOf().pathname, u.valueOf().search);
console.log("ignored:", u.toString(mark("s")), u.toLocaleString(mark("l")), u.toJSON(mark("j")), u.valueOf(mark("v")) === u, seen);
console.log("own:", Object.keys(u).length, Object.getOwnPropertyNames(u).length, Object.hasOwn(u, "href"));
const descs: any = Object.getOwnPropertyDescriptors(u);
console.log("desc:", String(Object.getOwnPropertyDescriptor(u, "href")), Object.keys(descs).length);
console.log("proto:", u.hasOwnProperty("href"), u.propertyIsEnumerable("href"));
console.log("reflect:", Reflect.ownKeys(u).length, String(Reflect.getOwnPropertyDescriptor(u, "href")));
console.log("integrity:", Object.isExtensible(u, mark("E")), Object.isSealed(u, mark("L")), Object.isFrozen(u, mark("F")), Reflect.isExtensible(u, mark("I")));
console.log("reflect get:", Reflect.get(u, "href", {}, mark("g")), String(Reflect.get(u, "missing", mark("x"))), Reflect.has(u, "href", mark("h")), Reflect.has(u, "missing", mark("H")), seen);
