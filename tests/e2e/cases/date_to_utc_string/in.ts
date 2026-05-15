const date = new Date("2020-02-03T04:05:06.007Z");
const invalid = new Date(NaN);

console.log("utc:", date.toUTCString());
console.log("gmt:", date.toGMTString());
console.log("invalid:", invalid.toUTCString());
