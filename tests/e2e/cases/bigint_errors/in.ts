function invalidString(): string {
    try {
        return BigInt("not-a-bigint").toString();
    } catch (err) {
        return String(err);
    }
}

function invalidNumber(value: number): string {
    try {
        return BigInt(value).toString();
    } catch (err) {
        return String(err);
    }
}

function divZero(): string {
    try {
        return (10n / 0n).toString();
    } catch (err) {
        return String(err);
    }
}

function modZero(): string {
    try {
        return (10n % 0n).toString();
    } catch (err) {
        return String(err);
    }
}

function negativeExponent(): string {
    try {
        return (2n ** (-1n)).toString();
    } catch (err) {
        return String(err);
    }
}

function hugeExponent(): string {
    try {
        return (2n ** BigInt("18446744073709551616")).toString();
    } catch (err) {
        return String(err);
    }
}

function invalidRadix(radix: number): string {
    try {
        return (255n).toString(radix);
    } catch (err) {
        return String(err);
    }
}

console.log("string:", invalidString());
console.log("fraction:", invalidNumber(1.5));
console.log("infinity:", invalidNumber(Infinity));
console.log("div:", divZero());
console.log("mod:", modZero());
console.log("negative pow:", negativeExponent());
console.log("huge pow:", hugeExponent());
console.log("radix low:", invalidRadix(1));
console.log("radix high:", invalidRadix(37));
console.log("valid:", BigInt("0xff").toString(), (2n ** 8n).toString(), (255n).toString(16));
