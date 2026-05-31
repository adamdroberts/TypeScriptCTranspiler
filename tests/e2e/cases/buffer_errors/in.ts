const badEncoding: any = "bogus";
const one = Buffer.from("ff", "hex");
const two = Buffer.from("ffff", "hex");
const three = Buffer.from("ffffff", "hex");

function invalidBase64(): string {
    try {
        return Buffer.from("@@@", "base64").toString();
    } catch (err) {
        return String(err);
    }
}

function oddHex(): string {
    try {
        return Buffer.from("abc", "hex").toString("hex");
    } catch (err) {
        return String(err);
    }
}

function badHex(): string {
    try {
        return Buffer.from("zz", "hex").toString("hex");
    } catch (err) {
        return String(err);
    }
}

function badFromEncoding(): string {
    try {
        return Buffer.from("data", badEncoding).toString();
    } catch (err) {
        return String(err);
    }
}

function badAlloc(): string {
    try {
        return Buffer.alloc(-1).toString();
    } catch (err) {
        return String(err);
    }
}

function badConcat(): string {
    try {
        return Buffer.concat([one], -1).toString();
    } catch (err) {
        return String(err);
    }
}

function badToString(): string {
    try {
        return one.toString(badEncoding);
    } catch (err) {
        return String(err);
    }
}

function badByteLength(): string {
    try {
        return String(Buffer.byteLength("data", badEncoding));
    } catch (err) {
        return String(err);
    }
}

function badRead8(): string {
    try {
        return String(one.readUInt8(1));
    } catch (err) {
        return String(err);
    }
}

function badWrite8(): string {
    try {
        return String(one.writeInt8(1, 1));
    } catch (err) {
        return String(err);
    }
}

function badReadWide(): string {
    try {
        return String(two.readUInt16LE(1));
    } catch (err) {
        return String(err);
    }
}

function badSwap(): string {
    try {
        return three.swap16().toString("hex");
    } catch (err) {
        return String(err);
    }
}

console.log("base64:", invalidBase64());
console.log("hex odd:", oddHex());
console.log("hex digit:", badHex());
console.log("from encoding:", badFromEncoding());
console.log("alloc:", badAlloc());
console.log("concat:", badConcat());
console.log("toString:", badToString());
console.log("byteLength:", badByteLength());
console.log("read8:", badRead8());
console.log("write8:", badWrite8());
console.log("read wide:", badReadWide());
console.log("swap:", badSwap());
console.log("valid:", Buffer.from("4869", "hex").toString(), Buffer.alloc(2, 65).toString(), Buffer.concat([one]).toString("hex"));
