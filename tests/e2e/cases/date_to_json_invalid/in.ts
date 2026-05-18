const invalid = new Date(NaN);
const valid = new Date(Date.UTC(2021, 6, 8, 9, 10, 11, 12));
let seen = 0;

function mark(): string {
    seen += 1;
    return "key";
}

console.log("invalid:", invalid.toJSON());
console.log("valid:", valid.toJSON());
console.log("key:", valid.toJSON(mark()), seen);
