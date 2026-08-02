import * as nodefs from "node:fs";

const root = "/tmp/tsc2c-fs-path-result-encoded";
const target = path.join(root, "target.txt");
const link = path.join(root, "target-link");
const tempPrefix = "/tmp/tsc2c-enc-";
const HEX = "hex";
const BASE64 = "base64";

fs.rmSync(root, { recursive: true, force: true });
fs.mkdirSync(root, { recursive: true });
fs.writeFileSync(target, "target");
fs.symlinkSync(target, link);

const rootHex = Buffer.from(root).toString(HEX);
const rootBase64 = Buffer.from(root).toString(BASE64);
const targetHex = Buffer.from(target).toString(HEX);
const targetBase64 = Buffer.from(target).toString(BASE64);

console.log("sync path:", fs.realpathSync(root, HEX) === rootHex, nodefs.readlinkSync(link, { encoding: BASE64 }) === targetBase64);

const tempPrefixHex = Buffer.from(tempPrefix).toString(HEX);
const tempPrefixBase64 = Buffer.from(tempPrefix).toString(BASE64);
const syncTempHex = fs.mkdtempSync(tempPrefix, { encoding: HEX });
console.log("sync mkdtemp:", syncTempHex.startsWith(tempPrefixHex));
fs.rmSync(Buffer.from(syncTempHex, HEX).toString(), { recursive: true, force: true });

fs.promises.realpath(root, { encoding: BASE64 })
    .then((promiseRealpath: string): any => {
        console.log("promise realpath:", promiseRealpath === rootBase64);
        return nodefs.promises.readlink(link, HEX);
    })
    .then((promiseReadlink: string): any => {
        console.log("promise readlink:", promiseReadlink === targetHex);
        return nodefs.promises.mkdtemp(tempPrefix, BASE64);
    })
    .then((promiseTemp: string): void => {
        console.log("promise mkdtemp:", promiseTemp.startsWith(tempPrefixBase64));
        fs.rmSync(Buffer.from(promiseTemp, BASE64).toString(), { recursive: true, force: true });
        fs.rmSync(root, { recursive: true, force: true });
    });
