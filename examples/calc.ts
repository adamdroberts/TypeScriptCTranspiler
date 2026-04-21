// CLI calculator.
// Usage: calc <a> <op> <b>   e.g.   calc 3.5 '*' 4
// Demonstrates: process.argv, parseFloat, switch, template literals, process.exit.

function apply(a: number, op: string, b: number): number {
    switch (op) {
        case "+": return a + b;
        case "-": return a - b;
        case "*": case "x": return a * b;
        case "/": return a / b;
        default:
            console.error("unknown op:", op);
            process.exit(2);
            return 0; // unreachable; satisfies control-flow analysis
    }
}

// In a compiled binary, argv[0] is the program path; user args start at argv[1].
// (Node's convention of argv[0]="node", argv[1]="script.js" doesn't apply here —
// there's no runtime to prepend.)
const args = process.argv;
if (args.length < 4) {
    console.error("usage: calc <a> <op> <b>");
    process.exit(1);
}
const a = parseFloat(args[1]);
const op = args[2];
const b = parseFloat(args[3]);
console.log(`${a} ${op} ${b} = ${apply(a, op, b)}`);
