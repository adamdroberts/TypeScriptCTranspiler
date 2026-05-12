const u = new URL("https://example.com:8443/a/b?x=1#frag");

console.log("toString:", u.toString());
console.log("locale:", u.toLocaleString());
console.log("json:", u.toJSON());
console.log("concat:", "url=" + u);
console.log("value:", u.valueOf().pathname, u.valueOf().search);
console.log("own:", Object.keys(u).length, Object.getOwnPropertyNames(u).length, Object.hasOwn(u, "href"));
const descs: any = Object.getOwnPropertyDescriptors(u);
console.log("desc:", String(Object.getOwnPropertyDescriptor(u, "href")), Object.keys(descs).length);
console.log("proto:", u.hasOwnProperty("href"), u.propertyIsEnumerable("href"));
console.log("reflect:", Reflect.ownKeys(u).length, String(Reflect.getOwnPropertyDescriptor(u, "href")));
