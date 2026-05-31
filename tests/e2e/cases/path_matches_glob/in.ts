import { posix, matchesGlob } from "path";
import * as nodePath from "node:path";
import * as subPath from "path/posix";
import * as nodeSubPath from "node:path/posix";

let seen = "";
function mark(label: string): string {
  seen += label;
  return label;
}

// Global path
console.log("global exact:", path.matchesGlob("foo/bar", "foo/bar", mark("1")));
console.log("global star:", path.matchesGlob("foo/bar", "foo/*", mark("2")));
console.log("global question:", path.matchesGlob("foo/bar", "foo/ba?", mark("3")));

// Namespace path
console.log("nodePath exact:", nodePath.matchesGlob("foo/bar", "foo/baz"));
console.log("nodePath star no-match:", nodePath.matchesGlob("foo/bar/baz", "foo/*"));

// Named import
console.log("named exact:", matchesGlob("foo/bar", "foo/bar"));
console.log("named star:", matchesGlob("foo/bar/baz", "foo/*/baz"));

// Posix subpath
console.log("posix exact:", posix.matchesGlob("foo/bar", "foo/bar"));
console.log("posix star complex:", posix.matchesGlob("foo/abc-xyz/bar.js", "foo/*-xyz/*.js"));
console.log("posix star no-match:", posix.matchesGlob("foo/abc-xyz/bar.js", "foo/*-xyz/*.ts"));

// Subpath imports
console.log("subpath exact:", subPath.matchesGlob("foo/bar", "foo/bar"));
console.log("nodeSubpath exact:", nodeSubPath.matchesGlob("foo/bar", "foo/bar"));

// Star matching empty string
console.log("star empty:", matchesGlob("foo/", "foo/*"));
console.log("star empty 2:", matchesGlob("foo/bar", "foo/bar*"));

// Question mark no match for slash
console.log("question slash:", matchesGlob("foo/bar", "foo?bar"));

// Multi-char stars
console.log("multi-star:", matchesGlob("foo/bar.spec.js", "foo/*.spec.js"));
console.log("multi-star no-match:", matchesGlob("foo/bar.spec.js", "foo/*.test.js"));

// Extra ignored parameters
console.log("ignored:", seen);
