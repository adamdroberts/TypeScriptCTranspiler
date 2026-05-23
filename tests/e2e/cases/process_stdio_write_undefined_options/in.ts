let callbacks = 0;

function done(): void {
    callbacks++;
}

const outDefault = process.stdout.write("u:", undefined);
const outCallback = process.stdout.write("cb:", undefined, done);
const outBuffer = process.stdout.write(Buffer.from("bufu:"), undefined, done);
const errDefault = process.stderr.write("", undefined);
const errCallback = process.stderr.write("", "utf8", undefined);

console.log("undefined write", outDefault, outCallback, outBuffer, errDefault, errCallback, callbacks);
