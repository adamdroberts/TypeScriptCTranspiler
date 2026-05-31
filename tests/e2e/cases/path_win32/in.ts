import * as path from "path";
import { win32 } from "path";
import * as win32Path from "path/win32";

// Constants
console.log("sep:", path.win32.sep);
console.log("delimiter:", path.win32.delimiter);

// Join and Resolve
console.log("join1:", path.win32.join("C:\\alpha", "beta", "..\\gamma"));
console.log("join2:", win32.join("alpha", "beta"));
console.log("resolve:", win32Path.resolve("C:\\a\\b", "..\\c"));

// Normalize and IsAbsolute
console.log("normalize1:", path.win32.normalize("C:\\foo\\\\bar\\..\\baz"));
console.log("normalize2:", path.win32.normalize("foo/bar/../baz"));
console.log("isAbsolute1:", path.win32.isAbsolute("C:\\foo"));
console.log("isAbsolute2:", win32.isAbsolute("\\\\server\\share"));
console.log("isAbsolute3:", win32Path.isAbsolute("foo"));

// Relative
console.log("relative1:", path.win32.relative("C:\\a\\b", "C:\\a\\c"));
console.log("relative2:", win32.relative("C:\\a\\b", "D:\\a\\c"));
console.log("relative3:", win32Path.relative("a\\b", "a\\b\\c"));

// Namespaced
console.log("namespaced:", path.win32.toNamespacedPath("C:\\foo\\bar"));

// Basename, Dirname, Extname
console.log("basename1:", path.win32.basename("C:\\foo\\bar.txt"));
console.log("basename2:", win32.basename("C:\\foo\\bar.txt", ".txt"));
console.log("dirname:", win32.dirname("C:\\foo\\bar.txt"));
console.log("extname:", win32Path.extname("C:\\foo\\bar.txt"));

// Parse & Format
const parsed = win32Path.parse("C:\\foo\\bar.txt");
console.log("parsed:", parsed.root, parsed.dir, parsed.base, parsed.ext, parsed.name);
console.log("format:", win32.format(parsed));

// MatchesGlob
console.log("glob1:", path.win32.matchesGlob("foo\\bar.txt", "foo\\*.txt"));
console.log("glob2:", win32.matchesGlob("foo\\bar", "foo/*"));
console.log("glob3:", win32Path.matchesGlob("foo\\bar", "bar/*"));
