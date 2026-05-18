process.env.TZ = "UTC";

const full = new Date(2020, 1, 3, 4, 5, 6, 7);
const shortYear = new Date(99, 0, 1);
const overflow = new Date(2020, 13, 1);
const invalid = new Date(2020, NaN);
let seen = "";

function mark(label: string): number {
    seen += label;
    return 12345;
}

const extra = new Date(2020, 1, 3, 4, 5, 6, 7, mark("x"));

console.log("full:", full.toISOString());
console.log("short:", shortYear.toISOString());
console.log("overflow:", overflow.toISOString());
console.log("invalid:", Number.isNaN(invalid.getTime()));
console.log("extra:", extra.toISOString(), seen);
