console.log("collapse:", path.normalize("a//b/./c"));
console.log("parent abs:", path.normalize("/a/b/../c"));
console.log("parent rel:", path.normalize("a/../../b"));
console.log("empty:", path.normalize(""));
console.log("trailing:", path.normalize("foo/"));
console.log("parent root:", path.normalize("foo/.."));
console.log("abs true:", path.isAbsolute("/tmp"));
console.log("abs false:", path.isAbsolute("tmp"));
