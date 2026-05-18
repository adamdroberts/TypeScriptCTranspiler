const date = new Date(Date.UTC(2020, 1, 3, 4, 5, 6, 7));
const epoch = new Date(0);
const invalid = new Date(NaN);

console.log("date:", date.toISOString());
console.log("epoch:", epoch.toISOString());

try {
    console.log("invalid:", invalid.toISOString());
} catch (err) {
    console.log("invalid caught:", err);
}
