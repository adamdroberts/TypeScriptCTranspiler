process.env.TZ = "UTC";

const date = new Date(Date.UTC(2020, 1, 3, 4, 5, 6, 7));
const invalid = new Date(NaN);

console.log("get:", date.getFullYear(), date.getYear());
console.log("set 99:", new Date(date.setYear(99)).getUTCFullYear(), date.getYear());
console.log("set 2024:", new Date(date.setYear(2024)).getUTCFullYear(), date.getYear());
console.log("invalid before:", Number.isNaN(invalid.getYear()));
console.log("invalid set:", new Date(invalid.setYear(1)).getUTCFullYear(), invalid.getYear());
console.log("nan year:", Number.isNaN(date.setYear(NaN)), Number.isNaN(date.getTime()));
