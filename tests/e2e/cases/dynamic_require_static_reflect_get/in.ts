const fromObject = require(Reflect.get({ pick: "./object_value" }, "pick"));
const fromArray = require("./" + Reflect.get(["array_value"], "0"));
const fromArrayLength = require("./len_" + Reflect.get(["x", "y"], "length"));
const fromString = require("./char_" + Reflect.get("go", "1"));
const fromStringLength = require("./strlen_" + Reflect.get("go", "length"));

console.log(fromObject.label, fromArray.label, fromArrayLength.label, fromString.label, fromStringLength.label);
