import {nodeReferenceSync} from './node-reference';
import {expect, test} from "bun:test";
import ts from "typescript";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {compile} from "../../src/compile";
import {earlyControlFlowStaticSemanticsFailure} from "../../src/control-static-semantics";
import {createEcmaSourceFile, type EcmaParseGoal} from "../../src/ecmascript-source";
import {earlyFunctionStaticSemanticsFailure} from "../../src/function-static-semantics";
import {earlyModuleStaticSemanticsFailure} from "../../src/module-static-semantics";
import {parseHostObservation} from "../test262/protocol";
import {finiteEvalScriptSourceGraph} from "../test262/native-host";

test("resource grammar follows parse goals and independent function and statement-list boundaries", () => {
    const contexts: Record<string, (declaration: string) => string> = {
        source: declaration => declaration,
        block: declaration => `{${declaration}}`,
        function: declaration => `function f(){${declaration}}`,
        asyncFunction: declaration => `async function f(){${declaration}}`,
        generator: declaration => `function* f(){${declaration}}`,
        asyncGenerator: declaration => `async function* f(){${declaration}}`,
        arrow: declaration => `const f=()=>{${declaration}};`,
        asyncArrow: declaration => `const f=async()=>{${declaration}};`,
        method: declaration => `const o={f(){${declaration}}};`,
        asyncMethod: declaration => `const o={async f(){${declaration}}};`,
        staticBlock: declaration => `class C{static{${declaration}}}`,
        asyncStaticBoundary: declaration => `async function f(){class C{static{${declaration}}}}`,
        nestedFunctionBoundary: declaration => `async function f(){function g(){${declaration}}}`,
        computedMethodBoundary: declaration => `const o={[(()=>{${declaration}return "name";})()](){}};`,
        case: declaration => `switch(0){case 0:${declaration}break;}`,
        default: declaration => `switch(0){default:${declaration}}`,
        caseBlock: declaration => `switch(0){case 0:{${declaration}}break;}`,
        defaultBlock: declaration => `switch(0){default:{${declaration}}}`,
        statement: declaration => `if(false)${declaration}`,
        label: declaration => `label:${declaration}`,
        exported: declaration => `export ${declaration}`,
    };
    const cases: Array<{source: string; goal: EcmaParseGoal; label: string; specFailure?: true}> = [];
    for (const goal of ["script", "module"] as const)
        for (const strict of [false, true])
            for (const hint of ["using", "await using"])
                for (const binding of ["value=null", "value", "let=null", "await=null", "yield=null", "of=null", "value=null,value=null", "{value}={}", "[value]=[]"])
                    for (const [context, wrap] of Object.entries(contexts))
                        cases.push({goal, label: `${goal}:${strict}:${hint}:${binding}:${context}`,
                            source: (strict ? '"use strict";' : "") + wrap(`${hint} ${binding};`)});
    for (const goal of ["script", "module"] as const)
        for (const asynchronous of [false, true])
            for (const hint of ["using", "await using"])
                for (const head of ["value of []", "of of []", "value in {}", "value=null;false;", "value;false;", "value=null of []", "value,second of []", "{value} of []"])
                    cases.push({goal, label: `${goal}:${asynchronous}:${hint}:${head}`,
                        source: `${asynchronous ? "async " : ""}function f(){for(${hint} ${head}){}}`});
    cases.push(
        {goal: "script", label: "using-reference", source: "var using=0;using;"},
        {goal: "script", label: "await-reference", source: "function f(){var await=0;await;}"},
        {goal: "script", label: "escaped-directive", source: String.raw`"use\u0020strict";{using eval=null;}`},
        {goal: "script", label: "escaped-function-directive", source: String.raw`function f(){"use\u0020strict";using eval=null;}`},
        {goal: "module", label: "trivia", source: "using/*\n*/value=null;"},
        {goal: "module", label: "async-trivia", source: "await/*\n*/using value=null;"},
        // ECMA-262 5.1.5 forbids escapes in literal grammar terminals. Node 26
        // accepts an escaped `using` token; this partition follows that rule.
        {goal: "module", label: "escaped-keyword", source: String.raw`us\u0069ng value=null;`, specFailure: true},
    );
    const reference = nodeReferenceSync(["node", "--experimental-vm-modules", "--no-warnings", "-e",
        'const vm=require("node:vm"),fs=require("node:fs");const cases=JSON.parse(fs.readFileSync(0,"utf8"));fs.writeSync(1,JSON.stringify(cases.map(({source,goal})=>{try{goal==="module"?new vm.SourceTextModule(source):new vm.Script(source);return false;}catch(error){if(error.name!=="SyntaxError")throw error;return true;}})));'],
        {stdin: Buffer.from(JSON.stringify(cases)), stdout: "pipe", stderr: "pipe"});
    expect({exitCode: reference.exitCode, stderr: reference.stderr.toString()}).toEqual({exitCode: 0, stderr: ""});
    const expected: boolean[] = JSON.parse(reference.stdout.toString());
    for (const [index, candidate] of cases.entries()) {
        const source = createEcmaSourceFile("main.js", candidate.source, ts.ScriptTarget.ESNext, true, ts.ScriptKind.JS, candidate.goal);
        const diagnostics = (source as ts.SourceFile & {parseDiagnostics: readonly ts.Diagnostic[]}).parseDiagnostics;
        const failure = diagnostics.length > 0 || !!earlyControlFlowStaticSemanticsFailure(source) ||
            !!earlyFunctionStaticSemanticsFailure(source) || candidate.goal === "module" && !!earlyModuleStaticSemanticsFailure(source);
        expect({label: candidate.label, failure}).toEqual({label: candidate.label, failure: candidate.specFailure ?? expected[index]!});
    }
    for (const goal of ["script", "module"] as const) {
        const graph = finiteEvalScriptSourceGraph([{path: "main.js", goal,
            source: String.raw`"use\u0020strict";function f(){"use\u0020strict";eval("var value=1;");}f();`}]);
        expect(graph.error).toBeNull();
        expect(graph.directEvalSources.map(({strict, strictCaller}) => ({strict, strictCaller})))
            .toEqual([{strict: goal === "module", strictCaller: goal === "module"}]);
    }
});

test("resource grammar rejects invalid owners before emission and accepts deep legal owners natively", async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "tsc2c-resource-syntax-"));
    try {
        const invalid = [
            ["script", "using value=null;"],
            ["module", "switch(0){case 0:using value=null;}"],
            ["module", "switch(0){default:await using value=null;}"],
            ["module", "function f(){await using value=null;}"],
            ["module", "async function f(){class C{static{await using value=null;}}}"],
            ["module", "export using value=null;"],
            ["module", "for(using value in {}){}"],
            ["module", "for(using of of []){}"],
            ["module", "{using value;}"],
            ["module", "{using {value}={};}"],
            ["module", "{using value=null,value=null;}"],
            ["module", String.raw`us\u0069ng value=null;`],
        ] as const;
        for (const [index, [goal, source]] of invalid.entries()) {
            const entry = path.join(temporary, `invalid-${index}.js`); await fs.writeFile(entry, source);
            const diagnostics: string[] = [];
            const result = await compile({entry, output: path.join(temporary, `invalid-${index}`), emitCOnly: true,
                ...(goal === "module" ? {moduleRoots: [entry]} : {isolatedScriptRoots: [entry]}),
                diagnosticWriter: message => diagnostics.push(message)});
            expect({exitCode: result.exitCode, emitted: !!result.mainC}).toEqual({exitCode: 2, emitted: false});
            expect(diagnostics.join("").length).toBeGreaterThan(0);
        }
        for (const profile of [false, true]) {
            const source = `export {};
                function check(value,label){if(!value)throw label;${profile ? "print" : "console.log"}(label+":true");}
                using moduleResource=null;
                const escapedDirective=Function('"use\\\\u0020strict";using eval=null;return this;');
                const strictDirective=Function('"use strict";using value=null;return this;');
                const escapedThis=escapedDirective.call(null);
                check(escapedThis!==null && escapedThis===escapedDirective.call(undefined) && strictDirective.call(null)===null && strictDirective.call(undefined)===undefined,"resource-grammar-raw-directive");
                function deep(){${"{".repeat(512)}using value=null;return ()=>value;${"}".repeat(512)}}
                check(deep()()===null,"deep-resource-grammar-owner");
                let events=[];
                function resource(name){return {name,[Symbol.dispose](){events.push(this.name);}};}
                function loops(){for(using head=resource("initializer");false;){}for(using head of [resource("iteration")]){break;}}
                loops();check(events.join("|")==="initializer|iteration","resource-grammar-loop-heads");
                switch(0){case 0:{using value=resource("case");}break;default:{using value=null;}}
                check(events.at(-1)==="case","resource-grammar-case-block");
                async function run(){for(await using head=resource("async-initializer");false;){}for(await using of of [null]){check(of===null,"resource-grammar-async-of-binding");}}
                run().then(()=>check(events.at(-1)==="async-initializer","resource-grammar-implicit-await"));`;
            const referenceFile = path.join(temporary, `reference-${profile}.mjs`); await fs.writeFile(referenceFile, source);
            const reference = nodeReferenceSync(["node", "--experimental-vm-modules", "--no-warnings", "-e",
                'const vm=require("node:vm"),fs=require("node:fs");const print=line=>fs.writeSync(1,line+"\\n");const module=new vm.SourceTextModule(fs.readFileSync(process.argv[1],"utf8"),{context:vm.createContext({print,console:{log:print}})});module.link(()=>{}).then(()=>module.evaluate()).catch(error=>{fs.writeSync(2,String(error));process.exitCode=1;});', referenceFile],
                {stdout: "pipe", stderr: "pipe"});
            expect({exitCode: reference.exitCode, stderr: reference.stderr.toString()}).toEqual({exitCode: 0, stderr: ""});
            const expected = reference.stdout.toString().trimEnd().split("\n");
            expect(expected.at(-1)).toBe("resource-grammar-implicit-await:true");
            for (const noGc of [false, true]) {
                const directory = path.join(temporary, `${profile}-${noGc}`); await fs.mkdir(directory);
                const entry = path.join(directory, "main.mjs"), output = path.join(directory, "program"); await fs.writeFile(entry, source);
                const diagnostics: string[] = [];
                const result = await compile({entry, output, noGc, moduleRoots: [entry], initializationEntries: [entry],
                    ...(profile ? {test262Observation: {kind: "test262-native-observation" as const,
                        scenarioId: "property/resource-syntax.js#module", setupEntries: [], testEntry: entry, async: false, scriptEntries: []}} : {}),
                    diagnosticWriter: message => diagnostics.push(message)});
                expect({exitCode: result.exitCode, diagnostics: diagnostics.join("")}).toEqual({exitCode: 0, diagnostics: ""});
                const native = Bun.spawnSync([output], {stdout: "pipe", stderr: "pipe"});
                expect({exitCode: native.exitCode, stderr: native.stderr.toString()}).toEqual({exitCode: 0, stderr: ""});
                const observation = profile ? parseHostObservation(JSON.parse(native.stdout.toString())) : null;
                if (observation) expect(observation.kind).toBe("normal");
                expect((observation ? observation.stdout ?? "" : native.stdout.toString()).trimEnd().split("\n")).toEqual(expected);
            }
        }
    } finally {await fs.rm(temporary, {recursive: true, force: true});}
}, 600_000);
