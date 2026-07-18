const type = require("./bjson_" + Buffer.from([1, 2, 255]).toJSON().type);
const length = require("./bjson_" + Buffer.from([1, 2, 255]).toJSON().data.length);
const first = require("./bjson_" + Buffer.from([1, 2, 255]).toJSON().data[0]);
const last = require("./bjson_" + Buffer.from([1, 2, 255]).toJSON().data[2]);

console.log(type.label, length.label, first.label, last.label);
