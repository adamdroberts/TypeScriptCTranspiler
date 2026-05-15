const outOk = process.stdout.write(Buffer.from("buf:"));
const errOk = process.stderr.write(Buffer.alloc(0));

console.log("stdio buffer", outOk, errOk);
