const text = Date();
let seen = 0;

function mark(): number {
    seen += 1;
    return 123;
}

const ignored = Date(mark(), "ignored");

console.log("call:", typeof text, text.includes("GMT"), text.length > 20);
console.log("ignored:", typeof ignored, ignored.includes("GMT"), seen);

const constructed = new Date(0);
console.log("new:", typeof constructed, constructed.toISOString());
