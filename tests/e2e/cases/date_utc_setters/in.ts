const date = new Date(Date.UTC(2020, 0, 31, 23, 59, 58, 900));

console.log("start:", date.toISOString());
console.log("year:", date.setUTCFullYear(2021, 5, 7), date.toISOString());
console.log("hours:", date.setUTCHours(4, 5, 6, 7), date.toISOString());
console.log("minutes:", date.setUTCMinutes(8, 9, 10), date.toISOString());
console.log("seconds:", date.setUTCSeconds(11, 12), date.toISOString());
console.log("ms:", date.setUTCMilliseconds(13), date.toISOString());
console.log("month:", date.setUTCMonth(0, 2), date.toISOString());
console.log("date:", date.setUTCDate(3), date.toISOString());
