const dirPath = "/tmp/tsc2c-fs-promises-dir";
const filePath = path.join(dirPath, "note.txt");
const rmFilePath = "/tmp/tsc2c-fs-promises-rm.txt";
let names = "";

if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
if (fs.existsSync(rmFilePath)) fs.rmSync(rmFilePath);
if (fs.existsSync(dirPath)) fs.rmdirSync(dirPath);

fs.promises.mkdir(dirPath)
    .then((_value: any) => fs.promises.writeFile(filePath, "note"))
    .then((_value: any) => fs.promises.readdir(dirPath))
    .then((items: string[]) => {
        names = items.join("|");
        return fs.promises.unlink(filePath);
    })
    .then((_value: any) => fs.promises.writeFile(rmFilePath, "remove me"))
    .then((_value: any) => fs.promises.rm(rmFilePath))
    .then((_value: any) => fs.promises.rmdir(dirPath))
    .then((_value: any): void => {
        console.log("names:", names);
        console.log("file exists:", fs.existsSync(filePath));
        console.log("rm exists:", fs.existsSync(rmFilePath));
        console.log("dir exists:", fs.existsSync(dirPath));
    });
