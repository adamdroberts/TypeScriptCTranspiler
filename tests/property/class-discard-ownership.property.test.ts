import {expect, test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {nodeReferenceSync} from './node-reference';
import {parseHostObservation} from '../test262/protocol';

const source = `// @ts-nocheck
let trace = '';
const marker = {};
function discard(): number {
    const PureUnobserved = class Unobserved {
        value = (() => { throw marker; })();
        read() { throw marker; }
    };
    (class Discarded { value = (() => { throw marker; })(); });
    return 17;
}
console.log('discarded', discard());
function key() { trace += 'K'; return 'field'; }
function initializer() { trace += 'I'; return marker; }
function effectful() {
    const UnusedEffectful = class {
        static [key()] = initializer();
        value = (() => { throw marker; })();
    };
}
effectful();
class Base {}
Base = new Proxy(Base, {get(target, name, receiver) {
    if (name === 'prototype') trace += 'P';
    return Reflect.get(target, name, receiver);
}});
function heritage() { const UnusedDerived = class extends Base {}; }
heritage();
console.log('definition-effects', trace);
const ScriptExpression = class VisibleExpression { value = marker; };
class ScriptClass { read() { return marker; } }
let graph: any = {owner: ScriptExpression};
for (let depth = 0; depth < 2048; depth++) graph = {previous: graph};
`;
function observer(javascript: boolean): string {
    return `// @ts-nocheck
console.log('later-bindings', typeof ScriptExpression, new ScriptExpression().value === marker,
    new ScriptClass().read() === marker, Object.hasOwn(globalThis, 'ScriptExpression'));
for (let depth = 0; depth < 2048; depth++) graph = graph.previous;
console.log('retained-owner', graph.owner === ScriptExpression);
${javascript ? `console.log('source-spans', discard.toString().includes('PureUnobserved'),
    ScriptExpression.toString().includes('VisibleExpression'));` : ''}
console.log('observation-complete', true);`;
}
const erase = (value: string) => ts.transpileModule(value, {
    compilerOptions: {target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.None},
}).outputText;

test('discarded class definitions retain effects, Script owners and original JavaScript source', async () => {
    const root = await mkdtemp(join(tmpdir(), 'tsc2c-class-discard-'));
    try {
        for (const typed of [true, false]) for (const noGc of [false, true]) {
            const lastSource = observer(!typed), reference = join(root, `reference-${typed}-${noGc}.json`);
            await writeFile(reference, JSON.stringify([erase(source), erase(lastSource)]));
            const node = nodeReferenceSync(['node', '-e', `const fs=require('node:fs'),vm=require('node:vm');
const context=vm.createContext({console:{log(...values){fs.writeSync(1,values.map(String).join(' ')+'\\n')}}});
for(const source of JSON.parse(fs.readFileSync(process.argv[1],'utf8')))new vm.Script(source).runInContext(context);`, reference],
                {stdout: 'pipe', stderr: 'pipe', timeout: 120000});
            expect({code: node.exitCode, stderr: node.stderr.toString()}).toEqual({code: 0, stderr: ''});
            const expected = node.stdout.toString();
            expect(expected).toContain('discarded 17\ndefinition-effects KIP\nlater-bindings function true true false\nretained-owner true\n');
            expect(expected.endsWith('observation-complete true\n')).toBe(true);
            if (!typed) expect(expected).toContain('source-spans true true\n');
            const entry = join(root, `definitions-${typed}-${noGc}.${typed ? 'ts' : 'js'}`);
            const last = join(root, `observer-${typed}-${noGc}.js`), output = entry + '-native', diagnostics: string[] = [];
            await writeFile(entry, typed ? source : erase(source)); await writeFile(last, erase(lastSource));
            const built = await compile({entry: last, output, noGc, additionalRoots: [entry],
                isolatedScriptRoots: [entry, last], initializationEntries: [entry, last], buildDir: output + '-build',
                test262Observation: {kind: 'test262-native-observation', scenarioId: 'property/class-discard-ownership.js#default',
                    setupEntries: [entry], testEntry: last, scriptEntries: [entry, last], async: false},
                diagnosticWriter: message => diagnostics.push(message)});
            expect({typed, noGc, code: built.exitCode, diagnostics}).toEqual({typed, noGc, code: 0, diagnostics: []});
            const native = Bun.spawnSync([output], {stdout: 'pipe', stderr: 'pipe', timeout: 120000,
                env: {...process.env, GC_FREE_SPACE_DIVISOR: '100'}});
            expect({typed, noGc, code: native.exitCode, stderr: native.stderr.toString()})
                .toEqual({typed, noGc, code: 0, stderr: ''});
            expect(parseHostObservation(JSON.parse(native.stdout.toString()))).toMatchObject({kind: 'normal', stdout: expected});
        }
    } finally { await rm(root, {recursive: true, force: true}); }
}, 900000);
