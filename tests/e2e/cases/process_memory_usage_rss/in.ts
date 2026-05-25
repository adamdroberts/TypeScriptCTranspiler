import { memoryUsage } from "node:process";
import * as proc from "process";

let seen = "";
function mark(label: string): string {
    seen += label;
    return label;
}

const globalRss = process.memoryUsage.rss(mark("g"));
const namedRss = memoryUsage.rss(mark("n"));
const namespaceRss = proc.memoryUsage.rss(mark("p"));
const full: any = process.memoryUsage(mark("m"));

console.log("rss:", typeof globalRss, globalRss >= 0, typeof namedRss, namedRss >= 0, typeof namespaceRss, namespaceRss >= 0);
console.log("full:", typeof full.rss, full.rss >= 0);
console.log("seen:", seen);
