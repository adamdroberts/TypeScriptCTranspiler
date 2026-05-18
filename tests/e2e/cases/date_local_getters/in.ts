process.env.TZ = "UTC";

const date = new Date(Date.UTC(2020, 1, 3, 4, 5, 6, 7));
const invalid = new Date(NaN);

console.log("ymd:", date.getFullYear(), date.getMonth(), date.getDate(), date.getDay());
console.log("time:", date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds());
console.log("offset:", date.getTimezoneOffset());
console.log("invalid:", Number.isNaN(invalid.getFullYear()), Number.isNaN(invalid.getTimezoneOffset()));
