import plainDefault, { value as plainValue } from "./leaf";
import attributedDefault, { value as attributedValue, increment } from "./leaf" with { type: "javascript" };
import * as plain from "./leaf";
import * as attributed from "./leaf" with { type: "javascript" };
import * as bridge from "./bridge";
import data from "./data.json" with { "typ\u0065": "json" };
import { default as alias } from "./data.json" with { type: "json" };

console.log("same:", plain === attributed, bridge.plainNamespace === plain, bridge.attributedNamespace === attributed);
console.log("direct:", plainValue, attributedValue, plainDefault(), attributedDefault());
increment();
console.log("live:", plain.value, attributed.value, bridge.plain, bridge.attributed, attributedDefault());
console.log("decoded:", data === alias, data.token);
