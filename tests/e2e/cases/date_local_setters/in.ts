process.env.TZ = "UTC";

function show(label: string, result: number, date: Date) {
    console.log(label + ":", result === date.getTime(), date.toISOString());
}

let seen = "";

function mark(label: string): number {
    seen += label;
    return 12345;
}

const date = new Date(Date.UTC(2020, 0, 31, 23, 59, 58, 900));

show("year", date.setFullYear(2021, 1, 2), date);
show("month", date.setMonth(13, 3), date);
show("date", date.setDate(32), date);
show("hours", date.setHours(1, 2, 3, 4), date);
show("minutes", date.setMinutes(10, 11, 12), date);
show("seconds", date.setSeconds(20, 21), date);
show("millis", date.setMilliseconds(22), date);
show("extra-hours", date.setHours(2, 3, 4, 5, mark("h")), date);
show("extra-date", date.setDate(6, mark("d")), date);
console.log("seen:", seen);

const invalid = new Date(Date.UTC(2020, 0, 1));
console.log("invalid:", Number.isNaN(invalid.setMonth(NaN)), Number.isNaN(invalid.getTime()));

const invalidYear = new Date(NaN);
show("invalid-year", invalidYear.setFullYear(2020), invalidYear);
