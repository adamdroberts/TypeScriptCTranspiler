const invalid = new Date(NaN);
const valid = new Date(Date.UTC(2021, 6, 8, 9, 10, 11, 12));

console.log("invalid:", invalid.toJSON());
console.log("valid:", valid.toJSON());
