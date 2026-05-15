const stamp = Date.UTC(2020, 1, 3, 4, 5, 6, 7);
const date = new Date(stamp);

console.log("ymd:", date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCDay());
console.log("time:", date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds(), date.getUTCMilliseconds());
console.log("value:", date.getTime());
