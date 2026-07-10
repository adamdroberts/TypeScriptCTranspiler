// @ts-nocheck: dynamic require proof coverage intentionally exercises normalize calls.
const nfc = require("./normaliz\u0065\u0301".normalize("NFC"));
const defaultForm = require("./normalize-default".normalize());
const undefinedForm = require("./normalize-undefined".normalize(undefined));

console.log(nfc.label, defaultForm.label, undefinedForm.label);
