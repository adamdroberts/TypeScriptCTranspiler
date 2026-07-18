const key0 = require("./bok_" + Object.keys(Buffer.from("Hi"))[0]);
const key1 = require("./bok_" + Object.getOwnPropertyNames(Buffer.from("Hi"))[1]);
const reflectKey = require("./bok_" + Reflect.ownKeys(Buffer.from("AZ"))[1]);
const value0 = require("./bok_" + Object.values(Buffer.from("Hi"))[0]);
const value1 = require("./bok_" + Object.values(Buffer.from("Hi"))[1]);

console.log(key0.label, key1.label, reflectKey.label, value0.label, value1.label);
