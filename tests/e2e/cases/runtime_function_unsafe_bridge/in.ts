const body = process.argv.length > 1000 ? "return 0;" : "return args[0];";
const fn: (...args: unknown[]) => unknown = Function(body) as any;

console.log("function unsafe bridge:", fn(["value"]));
