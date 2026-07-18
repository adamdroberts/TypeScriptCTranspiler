const text = require("./bloc_" + Buffer.from("hello").toLocaleString());
const bytes = require("./bloc_" + Buffer.from([65, 90]).toLocaleString());
const hex = require("./bloc_" + Buffer.from("4869", "hex").toLocaleString());
const filled = require("./bloc_" + Buffer.alloc(2, 65).toLocaleString());

console.log(text.label, bytes.label, hex.label, filled.label);
