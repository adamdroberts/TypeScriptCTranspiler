const parsed = Date.parse("2020-02-03T04:05:06.007Z");
const fromString = new Date("2020-02-03T04:05:06.007Z");
const dateOnly = new Date("2020-02-03");
const plusOffset = Date.parse("2020-02-03T06:05:06.007+02:00");
const minusOffset = Date.parse("2020-02-03T01:35:06.007-02:30");
const invalid = Date.parse("not a date");

console.log("parse:", parsed, fromString.getTime(), fromString.toISOString());
console.log("date-only:", dateOnly.toISOString());
console.log("offsets:", plusOffset === parsed, minusOffset === parsed);
console.log("invalid:", Number.isNaN(invalid), String(new Date(invalid)));
