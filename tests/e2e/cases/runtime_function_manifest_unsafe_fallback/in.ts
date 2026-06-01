const body = process.argv.length > 1000 ? "return 6 * 7;" : "return args[0];";
const fn: (...args: unknown[]) => unknown = Function(body) as any;

console.log("manifest function unsafe fallback:", fn(["fallback"]));
