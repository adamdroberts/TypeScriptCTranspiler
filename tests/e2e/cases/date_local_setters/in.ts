process.env.TZ = "UTC";

function show(label: string, result: number, date: Date) {
    console.log(label + ":", result === date.getTime(), date.toISOString());
}

const date = new Date(Date.UTC(2020, 0, 31, 23, 59, 58, 900));

show("year", date.setFullYear(2021, 1, 2), date);
show("month", date.setMonth(13, 3), date);
show("date", date.setDate(32), date);
show("hours", date.setHours(1, 2, 3, 4), date);
show("minutes", date.setMinutes(10, 11, 12), date);
show("seconds", date.setSeconds(20, 21), date);
show("millis", date.setMilliseconds(22), date);

const invalid = new Date(Date.UTC(2020, 0, 1));
console.log("invalid:", Number.isNaN(invalid.setMonth(NaN)), Number.isNaN(invalid.getTime()));
