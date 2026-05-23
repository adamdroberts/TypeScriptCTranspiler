const outOk = process.stdout.write("raw:");
const errOk = process.stderr.write("");

console.log("write", outOk, errOk);

let seen = "";
function mark(label: string): string {
    seen += label;
    return "utf8";
}
function done(this: any): void {
    seen += this === undefined ? "cb" : "bad";
}
const outWithCallback = process.stdout.write("enc:", mark("e"), done);
console.log("callback", outWithCallback, seen);

let errSeen = "";
function errDone(): void {
    errSeen = "err";
}
const errWithCallback = process.stderr.write("", errDone);
console.log("stderr callback", errWithCallback, errSeen);
