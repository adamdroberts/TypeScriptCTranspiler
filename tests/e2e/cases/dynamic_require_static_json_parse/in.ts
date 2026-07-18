const fromObject = require("./json_parse_" + (JSON.parse("{\"name\":\"alpha\",\"count\":2}") as any).name);
const fromArray = require("./json_parse_" + (JSON.parse("[\"beta\",\"gamma\"]") as any)[1]);
const fromNested = require("./json_parse_" + (JSON.parse("{\"items\":[{\"label\":\"delta\"}]}") as any).items[0].label);
const fromNumber = require("./json_parse_" + (JSON.parse("{\"value\":7}") as any).value);
const fromBoolean = require("./json_parse_" + (JSON.parse("[true]") as any)[0]);

console.log(
    fromObject.label,
    fromArray.label,
    fromNested.label,
    fromNumber.label,
    fromBoolean.label,
);
