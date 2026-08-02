const tmpPath = "/tmp/tsc2c-fs-promises.txt";
const content = "hello from fs.promises\n";
let readBack = "";
let found = "missing";

fs.promises.writeFile(tmpPath, content)
    .then((_value: any) => fs.promises.access(tmpPath))
    .then((_value: any) => fs.promises.readFile(tmpPath))
    .then((text: string): Promise<string[]> => {
        readBack = text;
        return fs.promises.readdir("/tmp");
    })
    .then((names: string[]): string => {
        found = names.includes("tsc2c-fs-promises.txt") ? "found" : "missing";
        return found;
    });

setImmediate((): void => {
    console.log("read:", readBack.trim());
    console.log("found:", found);
});
