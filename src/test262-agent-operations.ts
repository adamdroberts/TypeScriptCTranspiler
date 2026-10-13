import * as fs from "node:fs";
import * as path from "node:path";
import {resolvePackageRoot} from "./program";

/** Source admission and the native owner project the same operation List. */
export const test262AgentOperations = new Map(
    [...fs.readFileSync(path.join(resolvePackageRoot(),"runtime","tsc_test262_agent.def"),"utf8")
        .matchAll(/^TSC_AGENT_MEMBER\((\w+),\s*(\w+),\s*(\d+),\s*(\d+)\)$/gm)]
        .map(match=>[match[1]!,{name:match[1]!,operation:match[2]!,length:Number(match[3]),roles:Number(match[4])}] as const),
);
