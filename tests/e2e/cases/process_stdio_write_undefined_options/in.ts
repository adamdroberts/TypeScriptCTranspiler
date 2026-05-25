let callbacks = 0;

function done(): void {
    callbacks++;
}

const outDefault = process.stdout.write("u:", undefined);
const outCallback = process.stdout.write("cb:", void 0, done);
const outBuffer = process.stdout.write(Buffer.from("bufu:"), undefined, done);
const errDefault = process.stderr.write("", void 0);
const errCallback = process.stderr.write("", "utf8", void 0);

console.log("undefined write", outDefault, outCallback, outBuffer, errDefault, errCallback, callbacks);
