const date = new Date(Date.UTC(2020, 1, 3, 4, 5, 6, 7));
let seen = "";

function mark(label: string): string {
    seen += label;
    return label;
}

// @ts-ignore JavaScript evaluates and ignores extra Date.now arguments.
const now = Date.now(mark("n"));

// @ts-ignore JavaScript evaluates and ignores extra zero-argument Date method arguments.
console.log("time:", date.getTime(mark("a")), date.valueOf(mark("b")));
// @ts-ignore JavaScript evaluates and ignores extra zero-argument Date method arguments.
console.log("utc:", date.getUTCFullYear(mark("c")), date.getUTCMonth(mark("d")), date.getUTCDate(mark("e")));
// @ts-ignore JavaScript evaluates and ignores extra zero-argument Date method arguments.
console.log("local:", date.getFullYear(mark("f")), date.getMonth(mark("g")), date.getDate(mark("h")));
// @ts-ignore JavaScript evaluates and ignores extra zero-argument Date method arguments.
console.log("offset:", date.getTimezoneOffset(mark("i")));
// @ts-ignore JavaScript evaluates and ignores extra zero-argument Date method arguments.
console.log("iso:", date.toISOString(mark("j")));
// @ts-ignore JavaScript evaluates and ignores extra zero-argument Date method arguments.
console.log("utc-string:", date.toUTCString(mark("k")));
// @ts-ignore JavaScript evaluates and ignores extra zero-argument Date method arguments.
console.log("date-string:", date.toDateString(mark("l")));
// @ts-ignore JavaScript evaluates and ignores extra zero-argument Date method arguments.
console.log("time-string:", date.toTimeString(mark("m")));
// @ts-ignore JavaScript evaluates and ignores extra Date.toJSON arguments.
console.log("json:", date.toJSON(mark("o"), mark("p")));
console.log("now:", now > 0);
console.log("seen:", seen);
