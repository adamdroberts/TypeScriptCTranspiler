import { expect, test } from "bun:test";
import vm from "node:vm";
import ts from "typescript";
import { sourceConstructorInvocations } from "../../src/source-value-flow";

function program(source: string): ts.Program {
    const filename = "source.js";
    const options = { noLib: true, allowJs: true, target: ts.ScriptTarget.ESNext };
    const host = ts.createCompilerHost(options);
    host.getSourceFile = name => name === filename ? ts.createSourceFile(name, source, ts.ScriptTarget.ESNext, true, ts.ScriptKind.JS) : undefined;
    host.readFile = name => name === filename ? source : undefined;
    host.fileExists = name => name === filename;
    return ts.createProgram([filename], options, host);
}

function capture(...args: unknown[]): unknown[] { return args; }
function includesActual(source: string): boolean {
    const actual = new vm.Script(source).runInNewContext({ Function: capture }).map(String);
    return sourceConstructorInvocations(program(source)).some(call => call.choices !== null &&
        call.choices.length === actual.length && call.choices.every((values, index) => values.includes(actual[index])));
}

test("actual Lists project mutable length and index locations across every call adapter", () => {
    const adapters = ["Function(...args)", "Function.apply(null,args)", "Reflect.apply(Function,null,args)", "Reflect.construct(Function,args)"];
    const mutations = [
        'args[0]="y";', 'args[1]="return 37;";', 'args[2]="return 41;";',
        'args.length=0;', 'args.length=1;', 'args.length=3;',
        'Reflect.set(args,"1","return 43;");',
        'Object.defineProperty(args,"1",{value:"return 47;"});',
    ];
    for (const mutation of mutations) for (const adapter of adapters) {
        const source = `var args=["x","return x+1;"];${mutation}${adapter};`;
        expect({ source, includesActual: includesActual(source) }).toEqual({ source, includesActual: true });
    }
    for (const adapter of adapters) {
        const source = 'const original=["x","return x+1;"];const snapshot=[...original];original[1]="return 53;";' +
            adapter.replaceAll("args", "snapshot") + ";";
        expect(includesActual(source)).toBe(true);
    }
    for (const mutation of ['args[1]=external;', 'args[externalKey]="return 59;";', 'external(args);', 'args.length=external;']) {
        for (const adapter of adapters) {
            const source = `var args=["x","return x+1;"];${mutation}${adapter};`;
            expect({ source, allUnknown: sourceConstructorInvocations(program(source)).every(call => call.choices === null) })
                .toEqual({ source, allUnknown: true });
        }
    }
    const rest = 'function make(...args){args[0]="x";args[1]="return x+2;";return Function.apply(null,args);}make("return 61;");';
    expect(includesActual(rest)).toBe(true);
    let deep = 'var list0=["return 67;"];';
    for (let index = 1; index <= 512; index++) deep += `var list${index}=[...list${index - 1}];`;
    deep += 'list512[0]="return 71;";Function.apply(null,list512);';
    expect(includesActual(deep)).toBe(true);
    const cycle = 'var args=["return 73;"];args=["x",...args];Function(...args);';
    expect(sourceConstructorInvocations(program(cycle)).every(call => call.choices === null)).toBe(true);
});
