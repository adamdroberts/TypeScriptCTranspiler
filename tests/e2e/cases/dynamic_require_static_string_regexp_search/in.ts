const fromLetters = require("./ss_" + "Ada Lovelace 1843".search(/[A-Z][a-z]+/));
const fromDigits = require("./ss_" + "Ada Lovelace 1843".search(/\d+/));
const fromMissing = require("./ss_missing_" + "Ada Lovelace 1843".search(/Byron/));
const fromNewRegExp = require("./ss_new_" + "abc-123".search(new RegExp("\\d+")));

console.log(fromLetters.label, fromDigits.label, fromMissing.label, fromNewRegExp.label);
