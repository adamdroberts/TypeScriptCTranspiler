for (const text of ["-000001-07-01T00:00Z", "+010000-01-01T00:00:00.000Z", "2020", "2020-02", "2020-02-03T04:05", "1995-02-04T24:00Z", "Thu, 01 Jan 1970 00:00:00 GMT", "-000000-03-31T00:45Z", "+275760-09-13T00:00:00.001Z"]) console.log(Date.parse(text));
for (const value of [-8640000000000000, -62198755200000, 0, 8640000000000000]) {
    const date = new Date(value);
    console.log("roundtrip", Date.parse(date.toISOString()) === value, Date.parse(date.toUTCString()) === value, Date.parse(date.toString()) === value);
}
const hints: string[] = [];
const input: any = {[Symbol.toPrimitive](hint: string) {hints.push(hint); return "2000-01-01T00:00Z";}};
console.log("conversion", Date.parse(input), new Date(input).getTime(), hints.join("|"));
