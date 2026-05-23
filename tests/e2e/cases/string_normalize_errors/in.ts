const decomposed = "e\u0301";
const composed = "\u00e9";
const invalid: any = "BAD";
const dynamicText: any = decomposed;

function typedNormalize(form: any): string {
    try {
        return decomposed.normalize(form);
    } catch (err) {
        return String(err);
    }
}

function dynamicNormalize(form: any): string {
    try {
        return String(dynamicText.normalize(form));
    } catch (err) {
        return String(err);
    }
}

console.log("typed invalid:", typedNormalize(invalid));
console.log("dynamic invalid:", dynamicNormalize(invalid));
console.log("typed valid:", typedNormalize("NFC") === composed);
console.log("dynamic valid:", dynamicNormalize("NFC") === composed);
