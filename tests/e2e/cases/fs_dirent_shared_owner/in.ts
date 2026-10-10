import fs from "node:fs";
import { originalDirent, isFile, retainedEntry } from "./owner";

const root = "/tmp/tsc2c-fs-dirent-shared-owner";
fs.rmSync(root, { recursive: true, force: true });
fs.mkdirSync(root, { recursive: true });
fs.writeFileSync(root + "/file", "contents");
const entry = fs.readdirSync(root, { withFileTypes: true })[0];
console.log("owners:", originalDirent === fs.Dirent, entry instanceof originalDirent, entry.constructor === originalDirent);
console.log("borrowed:", isFile.call(entry), Object.getPrototypeOf(entry) === originalDirent.prototype);
entry.name = "renamed";
console.log("fields:", entry.name, entry.parentPath === root, Object.keys(entry).join("|"));
class DerivedDirent extends originalDirent {}
const derived = new DerivedDirent("derived", 2, root);
console.log("derived:", derived instanceof DerivedDirent, derived.isDirectory(), derived.name);
retainedEntry(root).then(value => {
    console.log("resumed:", value.name, isFile.call(value), Object.getPrototypeOf(value) === originalDirent.prototype);
    fs.rmSync(root, { recursive: true, force: true });
});
