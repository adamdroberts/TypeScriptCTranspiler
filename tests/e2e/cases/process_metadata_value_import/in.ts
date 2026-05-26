import { argv0, argv0 as argv0Alias, execArgv, execArgv as execArgvAlias, pid, pid as pidAlias, platform, platform as platformAlias, version, version as versionAlias } from "node:process";
import * as proc from "process";

const versions: any = proc.versions;
const release: any = proc.release;
const features: any = proc.features;

console.log("named:", argv0.length > 0, execArgv.length >= 0, pid > 0, platform.length > 0, version.charAt(0));
console.log("alias:", argv0Alias.length > 0, execArgvAlias.length >= 0, pidAlias > 0, platformAlias.length > 0, versionAlias.charAt(0));
console.log("namespace ids:", proc.argv.length > 0, proc.execPath.length > 0, proc.title.length > 0, proc.ppid > 0);
console.log("namespace strings:", proc.arch.length > 0, proc.version.charAt(0));
console.log("objects:", typeof versions.node, typeof release.name, typeof features.inspector);
