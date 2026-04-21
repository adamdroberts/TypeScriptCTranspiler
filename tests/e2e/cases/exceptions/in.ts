function mayThrow(n: number): number {
    if (n < 0) {
        throw "negative not allowed: " + n;
    }
    return n * 2;
}

try {
    console.log("ok:", mayThrow(5));
} catch (e) {
    console.log("caught top-level:", e);
}

try {
    console.log("should not print:", mayThrow(-3));
} catch (e) {
    console.log("caught:", e);
}

// nested try/catch
try {
    try {
        throw "inner";
    } catch (e) {
        console.log("inner caught:", e);
        throw "wrapped: " + e;
    }
} catch (e) {
    console.log("outer caught:", e);
}
