const outOk = process.stdout.write(Buffer.from("buf:"));
const errOk = process.stderr.write(Buffer.alloc(0));

console.log("stdio buffer", outOk, errOk);

let seen = "";
function mark(label: string): string {
    seen += label;
    return "utf8";
}
function done(this: any): void {
    seen += this === undefined ? "cb" : "bad";
}
const outWithCallback = process.stdout.write(Buffer.from("bufcb:"), mark("b"), done);
console.log("buffer callback", outWithCallback, seen);
