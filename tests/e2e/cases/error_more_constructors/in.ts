const referenceError: ReferenceError = new ReferenceError("missing name");
const evalError = EvalError("bad eval");
const uriError = new URIError();

console.log("reference:", referenceError.name, referenceError.message, referenceError.toString());
console.log("eval:", evalError.name, evalError.message, String(evalError));
console.log("uri:", uriError.name, uriError.message, uriError.toLocaleString(), uriError.valueOf() === uriError);

try {
    throw referenceError;
} catch (e) {
    console.log("caught:", e);
}
