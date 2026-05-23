const source = process.argv.length > 1000 ? "0" : "1 + 2";

console.log("eval unsafe bridge:", eval(source));
