process.env.TZ = "UTC";

const date = new Date(Date.UTC(2020, 1, 3, 4, 5, 6, 7));
const epoch = new Date(0);
const invalid = new Date(NaN);

console.log("date:", date.toDateString());
console.log("epoch:", epoch.toDateString());
console.log("invalid:", invalid.toDateString());
