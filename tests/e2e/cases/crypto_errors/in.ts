const badAlgorithm: any = "sha384";
const badDigestEncoding: any = "latin1";

function badCreateHash(): string {
    try {
        return crypto.createHash(badAlgorithm).update("abc").digest("hex");
    } catch (err) {
        return String(err);
    }
}

function badRandomBytes(): string {
    try {
        return crypto.randomBytes(-1).toString("hex");
    } catch (err) {
        return String(err);
    }
}

function badDigest(): string {
    try {
        return crypto.createHash("sha256").update("abc").digest(badDigestEncoding);
    } catch (err) {
        return String(err);
    }
}

console.log("createHash:", badCreateHash());
console.log("randomBytes:", badRandomBytes());
console.log("digest:", badDigest());
console.log("valid:", crypto.createHash("sha1").update("abc").digest("hex").slice(0, 8), crypto.randomBytes(0).length);
