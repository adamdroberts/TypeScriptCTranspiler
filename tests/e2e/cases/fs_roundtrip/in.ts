const tmpPath = "/tmp/tsc2c-fs-test.txt";
const content = "hello from fs!\nline 2\n";

fs.writeFileSync(tmpPath, content);

if (!fs.existsSync(tmpPath)) {
    console.log("FAIL: file not written");
    process.exit(1);
}

const readBack = fs.readFileSync(tmpPath);
if (readBack === content) {
    console.log("round-trip OK, bytes:", readBack.length);
} else {
    console.log("FAIL: mismatch");
    console.log("expected:", content);
    console.log("got:", readBack);
}

console.log("dirname:", path.dirname(tmpPath));
console.log("basename:", path.basename(tmpPath));
console.log("extname:", path.extname(tmpPath));
console.log("joined:", path.join("/tmp", "foo", "bar.txt"));
