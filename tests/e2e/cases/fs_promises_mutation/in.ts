const dirPath = "/tmp/tsc2c-fs-promises-dir";
const filePath = path.join(dirPath, "note.txt");
const rmFilePath = "/tmp/tsc2c-fs-promises-rm.txt";
let names = "";

if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
if (fs.existsSync(rmFilePath)) fs.rmSync(rmFilePath);
if (fs.existsSync(dirPath)) fs.rmdirSync(dirPath);

fs.promises.mkdir(dirPath);
fs.promises.writeFile(filePath, "note");
fs.promises.readdir(dirPath).then((items: string[]): string => {
    names = items.join("|");
    return names;
});
fs.promises.unlink(filePath);
fs.promises.writeFile(rmFilePath, "remove me");
fs.promises.rm(rmFilePath);
fs.promises.rmdir(dirPath);

console.log("names:", names);
console.log("file exists:", fs.existsSync(filePath));
console.log("rm exists:", fs.existsSync(rmFilePath));
console.log("dir exists:", fs.existsSync(dirPath));
