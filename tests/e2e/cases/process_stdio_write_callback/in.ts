let callbacks = 0;
let seen = "";

function mark(label: string): string {
    seen += label;
    return "utf8";
}

const outOk = process.stdout.write("enc:", mark("e"), () => {
    callbacks++;
    process.stdout.write("cb:");
});
const bufOk = process.stdout.write(Buffer.from("bufcb:"), () => {
    callbacks += 2;
});
const errOk = process.stderr.write("", "utf8", () => {
    callbacks += 4;
});

console.log("write callbacks", outOk, bufOk, errOk, callbacks, seen);
