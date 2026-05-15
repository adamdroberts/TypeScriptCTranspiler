import * as nodefs from "node:fs";

const root = "/tmp/tsc2c-fs-link-path-encoding";
const nested = path.join(root, "nested");
const target = path.join(root, "target.txt");
const link = path.join(root, "target-link");

fs.rmSync(root, { recursive: true, force: true });
fs.mkdirSync(nested, { recursive: true });
fs.writeFileSync(target, "link target", "utf8");
fs.symlinkSync(target, link);

const syncRealpath = fs.realpathSync(path.join(nested, ".."), "utf8");
const syncReadlink = nodefs.readlinkSync(link, { encoding: "utf-8" });
console.log("sync:", syncRealpath === root, syncReadlink === target);

fs.promises.realpath(path.join(nested, ".."), { encoding: "utf8" }).then((promiseRealpath) => {
    console.log("promise realpath:", promiseRealpath === root);
});

nodefs.promises.readlink(link, "utf-8").then((promiseReadlink) => {
    console.log("promise readlink:", promiseReadlink === target);
});

fs.rmSync(root, { recursive: true, force: true });
