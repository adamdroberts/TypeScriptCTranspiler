const date = new Date(Date.UTC(2020, 1, 3, 4, 5, 6, 7));
let seen = "";

function mark(label: string): string {
    seen += label;
    return label;
}

const now = Date.now(mark("n"));

console.log("time:", date.getTime(mark("a")), date.valueOf(mark("b")));
console.log("utc:", date.getUTCFullYear(mark("c")), date.getUTCMonth(mark("d")), date.getUTCDate(mark("e")));
console.log("local:", date.getFullYear(mark("f")), date.getMonth(mark("g")), date.getDate(mark("h")));
console.log("offset:", date.getTimezoneOffset(mark("i")));
console.log("iso:", date.toISOString(mark("j")));
console.log("utc-string:", date.toUTCString(mark("k")));
console.log("date-string:", date.toDateString(mark("l")));
console.log("time-string:", date.toTimeString(mark("m")));
console.log("json:", date.toJSON(mark("o"), mark("p")));
console.log("now:", now > 0);
console.log("seen:", seen);
