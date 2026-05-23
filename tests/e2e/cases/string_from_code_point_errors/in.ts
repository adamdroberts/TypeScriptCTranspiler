function fromPoint(value: number): string {
    try {
        return String.fromCodePoint(value);
    } catch (err) {
        return String(err);
    }
}

console.log("negative:", fromPoint(-1));
console.log("high:", fromPoint(0x110000));
console.log("fraction:", fromPoint(65.5));
console.log("infinity:", fromPoint(Infinity));
console.log("valid:", String.fromCodePoint(65, 33));
