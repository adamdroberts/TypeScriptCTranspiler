const fromArray = require("./" + Array.isArray(["x"]).toString().replace("true", "array"));
const fromObject = require("./" + Array.isArray({ value: "x" }).toString().replace("false", "object"));
const fromPrimitive = require("./" + Array.isArray("x").toString().replace("false", "primitive"));

console.log(fromArray.label, fromObject.label, fromPrimitive.label);
