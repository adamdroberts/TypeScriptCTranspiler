process.env.TZ = "UTC";

const date = new Date(Date.UTC(2020, 1, 3, 4, 5, 6, 7));
const epoch = new Date(0);
const invalid = new Date(NaN);
let seen = "";

function mark(label: string): string {
    seen += label;
    return label;
}

console.log("date:", date.toLocaleDateString(), date.toLocaleTimeString());
console.log("epoch:", epoch.toLocaleDateString(), epoch.toLocaleTimeString());
console.log("invalid:", invalid.toLocaleDateString(), invalid.toLocaleTimeString());
console.log(
    "args:",
    date.toLocaleString(mark("a"), mark("b")),
    date.toLocaleDateString(mark("c"), mark("d")),
    date.toLocaleTimeString(mark("e"), mark("f")),
    seen,
);
