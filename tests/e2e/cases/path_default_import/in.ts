import path from "node:path";

console.log("default join:", path.join("a", "b", "..", "c"));
console.log("default basename:", path.basename("/tmp/file.txt", ".txt"));
console.log("default constants:", path.sep, path.delimiter);
console.log("default posix:", path.posix.normalize("/a/./b"), path.posix.sep);
