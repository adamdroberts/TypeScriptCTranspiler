function typedRadix(radix: number): string {
    try {
        return (255).toString(radix);
    } catch (err) {
        return String(err);
    }
}

function typedMagnitude(): string {
    try {
        return (1e300).toString(2);
    } catch (err) {
        return String(err);
    }
}

const dynamicNumber: any = 255;
const hugeDynamic: any = 1e300;

function dynamicRadix(radix: any): string {
    try {
        return dynamicNumber.toString(radix);
    } catch (err) {
        return String(err);
    }
}

function dynamicMagnitude(): string {
    try {
        return hugeDynamic.toString(2);
    } catch (err) {
        return String(err);
    }
}

console.log("typed low:", typedRadix(1));
console.log("typed high:", typedRadix(37));
console.log("typed magnitude:", typedMagnitude());
console.log("dynamic low:", dynamicRadix(1));
console.log("dynamic high:", dynamicRadix(37));
console.log("dynamic null:", dynamicRadix(null));
console.log("dynamic magnitude:", dynamicMagnitude());
console.log("valid:", typedRadix(16), dynamicRadix(2));
