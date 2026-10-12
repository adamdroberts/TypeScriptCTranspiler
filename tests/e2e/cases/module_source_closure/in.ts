import source from "./source.json" with { type: "json" };
import payload from "./payload.json" with { type: "json" };
import { source as forwarded, space } from "./bridge.mjs";
const namespace: any = space;
console.log(eval(source));
console.log(eval(forwarded), eval(namespace.default));
console.log(eval(payload.code), eval(payload.__proto__.code));
console.log(Function(payload.body)());
