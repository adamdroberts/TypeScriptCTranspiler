const decomposed = "e\u0301";
const composed = "\u00e9";
const angstromSign = "\u212b";
const angstrom = "\u00c5";
let seen = "";

function mark(label: string): string {
    seen += label;
    return label;
}

console.log("nfc:", decomposed.normalize("NFC") === composed);
console.log("default:", decomposed.normalize() === composed);
console.log("nfd:", composed.normalize("NFD") === decomposed);
console.log("nfkc:", angstromSign.normalize("NFKC") === angstrom);
console.log("nfkd:", angstromSign.normalize("NFKD") === angstrom.normalize("NFD"));
console.log("ignored:", decomposed.normalize("NFC", mark("n")) === composed, seen);
