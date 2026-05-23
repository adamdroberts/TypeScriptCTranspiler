function capture(value: string): string {
    return value;
}

function fixedRange(): string {
    try {
        return capture((1).toFixed(101));
    } catch (err) {
        return String(err);
    }
}

function fixedFinite(): string {
    try {
        return capture((1).toFixed(Infinity));
    } catch (err) {
        return String(err);
    }
}

function exponentialRange(): string {
    try {
        return capture((1).toExponential(-1));
    } catch (err) {
        return String(err);
    }
}

function exponentialFinite(): string {
    try {
        return capture((1).toExponential(Infinity));
    } catch (err) {
        return String(err);
    }
}

function precisionRange(): string {
    try {
        return capture((1).toPrecision(0));
    } catch (err) {
        return String(err);
    }
}

function precisionFinite(): string {
    try {
        return capture((1).toPrecision(Infinity));
    } catch (err) {
        return String(err);
    }
}

const dynamicNumber: any = 1;

function dynamicRange(): string {
    try {
        return capture(dynamicNumber.toFixed(-1));
    } catch (err) {
        return String(err);
    }
}

console.log("fixed range:", fixedRange());
console.log("fixed finite:", fixedFinite());
console.log("exponential range:", exponentialRange());
console.log("exponential finite:", exponentialFinite());
console.log("precision range:", precisionRange());
console.log("precision finite:", precisionFinite());
console.log("dynamic range:", dynamicRange());
console.log("after:", (1.25).toFixed(1), (12.5).toExponential(1), (12.5).toPrecision(2));
