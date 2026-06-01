let source = process.argv.length > 1000 ? "1 + 4" : "2 + 5";

console.log("manifest eval unsafe fallback:", eval(source));
