import {expect, test} from 'bun:test';
import ts from 'typescript';
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compile} from '../../src/compile';
import {parseHostObservation} from '../test262/protocol';

function subject(stress: boolean): string {
    const fields = stress ? Array.from({length: 512}, (_, index) =>
        `static [key(${index})] = initialize(${index});`).join('\n') : '';
    return `// @ts-nocheck
let trace = '';
const marker = {};
class Base {}
Base = new Proxy(Base, {get(target, name, receiver) {
    if (name === 'prototype') trace += 'P';
    return Reflect.get(target, name, receiver);
}});
class Unused extends Base {}
console.log('heritage', trace);
function local() {
    class LocalBase {}
    LocalBase = 17;
    try { class UnusedLocal extends LocalBase {} return false; }
    catch (error) { return error instanceof TypeError; }
}
console.log('invalid-local', local());
class ThrowBase {}
ThrowBase = new Proxy(ThrowBase, {get(target, name, receiver) {
    if (name === 'prototype') throw marker;
    return Reflect.get(target, name, receiver);
}});
try { const UnusedExpression = class extends ThrowBase {}; console.log('expression', false); }
catch (error) { console.log('expression', error === marker); }
trace = '';
const keyOwner = {[Symbol.toPrimitive]() { trace += 'K'; return 'field'; }};
class DefinitionEffects {
    [keyOwner]() { throw marker; }
    instance = (() => { throw marker; })();
    static value = (() => { trace += 'I'; return marker; })();
    static { trace += 'B'; }
}
console.log('definition-order', trace);
try { class AbruptKey { [({[Symbol.toPrimitive]() { throw marker; }})]() {} } }
catch (error) { console.log('key-abrupt', error === marker); }
class VisibleClass { read() { return marker; } }
const VisibleExpression = class { value = marker; };
${stress ? `let keys = 0, values = 0, retained = null;
function key(index) { if (index !== keys++) throw marker; return 'field' + index; }
function initialize(index) {
    if (keys !== 512 || index !== values++) throw marker;
    retained = {index, previous: retained}; return retained;
}
class DefinitionWorklist { ${fields} }
let valid = keys === 512 && values === 512;
for (let index = 511; index >= 0; index--) {
    valid = valid && retained.index === index; retained = retained.previous;
}
console.log('definition-worklist', valid && retained === null);
` : ''}
console.log('definition-complete', true);
`;
}
const observer = `console.log('later-script-bindings', typeof Unused, typeof VisibleClass,
    new VisibleExpression().value === marker, new VisibleClass().read() === marker,
    Object.hasOwn(globalThis, 'VisibleClass'), Object.hasOwn(globalThis, 'VisibleExpression'));`;
const erase = (source: string) => ts.transpileModule(source, {
    compilerOptions: {target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext},
}).outputText;

test('class definition effects retain live heritage, ordered elements and Script bindings', async () => {
    const root = await mkdtemp(join(tmpdir(), 'tsc2c-class-definition-effects-'));
    try {
        for (const goal of ['module', 'script'] as const) for (const typed of [true, false]) for (const noGc of [false, true]) {
            const stress = goal === 'module' && typed && !noGc;
            const source = subject(stress), erased = erase(source);
            const oracle = join(root, `oracle-${goal}-${typed}-${noGc}.mjs`), stdout = oracle + '.stdout';
            await writeFile(oracle, goal === 'module' ? erased : JSON.stringify([erased, observer]));
            const prelude = 'const fs=require("node:fs");const console={log(...values){fs.writeSync(1,values.map(String).join(" ")+"\\n")}};';
            const node = Bun.spawnSync(['node', '-e', prelude + (goal === 'module'
                ? 'globalThis.console=console;import(process.argv[1]);'
                : 'const vm=require("node:vm"),context=vm.createContext({console});for(const source of JSON.parse(fs.readFileSync(process.argv[1],"utf8")))new vm.Script(source).runInContext(context);'), oracle],
                {stdout: Bun.file(stdout), stderr: 'pipe', timeout: 120000});
            expect({goal, typed, noGc, code: node.exitCode, stderr: node.stderr.toString()})
                .toEqual({goal, typed, noGc, code: 0, stderr: ''});
            const expected = await readFile(stdout, 'utf8');
            expect(expected).toContain('heritage P\ninvalid-local true\nexpression true\ndefinition-order KIB\nkey-abrupt true\n');
            expect(expected.endsWith(goal === 'script'
                ? 'later-script-bindings function function true true false false\n'
                : 'definition-complete true\n')).toBe(true);
            if (stress) expect(expected).toContain('definition-worklist true\n');
            const entry = join(root, `main-${goal}-${typed}-${noGc}.${typed ? 'ts' : 'js'}`);
            const last = entry + '-observer.js', output = entry + '-native', diagnostics: string[] = [];
            await writeFile(entry, typed ? source : erased);
            if (goal === 'script') await writeFile(last, observer);
            const built = await compile({entry: goal === 'script' ? last : entry, output, noGc,
                buildDir: output + '-build', ...(goal === 'module' ? {moduleRoots: [entry]} : {
                    additionalRoots: [entry], isolatedScriptRoots: [entry, last], initializationEntries: [entry, last],
                    test262Observation: {kind: 'test262-native-observation' as const,
                        scenarioId: 'property/class-definition-effects.js#default', setupEntries: [entry],
                        testEntry: last, async: false, scriptEntries: [entry, last]},
                }), diagnosticWriter: message => diagnostics.push(message)});
            expect({goal, typed, noGc, code: built.exitCode, diagnostics})
                .toEqual({goal, typed, noGc, code: 0, diagnostics: []});
            const native = Bun.spawnSync([output], {stdout: 'pipe', stderr: 'pipe', timeout: 120000,
                env: {...process.env, GC_FREE_SPACE_DIVISOR: '100'}});
            expect({goal, typed, noGc, code: native.exitCode, stderr: native.stderr.toString()})
                .toEqual({goal, typed, noGc, code: 0, stderr: ''});
            if (goal === 'script') {
                expect(parseHostObservation(JSON.parse(native.stdout.toString()))).toMatchObject({kind: 'normal', stdout: expected});
            } else expect(native.stdout.toString()).toBe(expected);
        }
    } finally { await rm(root, {recursive: true, force: true}); }
}, 900000);
