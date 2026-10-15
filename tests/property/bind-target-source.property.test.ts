import { expect, test } from "bun:test";
import { nodeReferenceSync } from "./node-reference";
import { finiteEvalScriptSourceGraph } from "../test262/native-host";

const partitions = [
    String.raw`var target;target=function named(){};var bound=target.bind(null);var retained=bound.bind(null);eval("'"+retained.name+"'");`,
    String.raw`let code="'safe'";const binder=Function.prototype.bind;const bad={get length(){code=external;return 0},get name(){code=external;return "bad"}};try{binder.call(bad,null)}catch{}eval(code);`,
    String.raw`const binder=Function.prototype.bind;const retained=binder.call(Function.prototype,null);eval("'"+retained.name+":"+retained.length+"'");`,
    String.raw`const capability=Promise.withResolvers();const retained=capability.resolve.bind(null);eval("'"+retained.name+":"+retained.length+"'");`,
    String.raw`const capability=Promise.withResolvers();const retained=capability.reject.bind(null,17);eval("'"+retained.name+":"+retained.length+"'");`,
];

test("bind metadata observes only actual callable target alternatives", () => {
    for (const source of partitions) {
        const reference = nodeReferenceSync(["node", "-e",
            'const fs=require("node:fs"),vm=require("node:vm");fs.writeSync(1,JSON.stringify(vm.runInNewContext(process.argv[1])));', source],
            { stdout: "pipe", stderr: "pipe", timeout: 30_000 });
        expect({ code: reference.exitCode, stderr: reference.stderr.toString() }).toEqual({ code: 0, stderr: "" });
        const value = JSON.parse(reference.stdout.toString());
        const graph = finiteEvalScriptSourceGraph([{ path: "subject.js", source }]);
        expect({ source, error: graph.error }).toEqual({ source, error: null });
        expect(graph.directEvalSources.map(entry => entry.source)).toContain("'" + value + "'");
    }
    for (const source of [
        'const retained=Function.prototype.bind.call(external,null);eval(retained.name);',
        'var target=function named(){};opaque(target);var retained=target.bind(null);eval(retained.name);',
    ]) {
        expect(finiteEvalScriptSourceGraph([{ path: "subject.js", source }]).error)
            .toContain("direct eval source is not a finite static string expression");
    }
});
