import {expect, test} from 'bun:test';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {nodeReferenceSync} from './node-reference';

test('Node reference capture preserves output, actual process options and failure status', () => {
    const root = mkdtempSync(join(tmpdir(), 'tsc2c-reference-options-'));
    try {
        const program = `const fs=require('node:fs');
console.log(process.cwd(),process.argv[1],process.env.REFERENCE_TOKEN,fs.readFileSync(0,'utf8'));
console.error('reference-error');process.exitCode=7;`;
        const result = nodeReferenceSync(['node', '-e', program, 'actual-argument'], {
            stdin: Buffer.from('actual-input'), stdout: 'pipe', stderr: 'pipe', cwd: root,
            env: {...process.env, REFERENCE_TOKEN: 'actual-environment'}, timeout: 10000,
        });
        expect({code: result.exitCode, success: result.success, stdout: result.stdout.toString(), stderr: result.stderr.toString()})
            .toEqual({code: 7, success: false,
                stdout: `${root} actual-argument actual-environment actual-input\n`, stderr: 'reference-error\n'});
        const empty = nodeReferenceSync(['node', '-e', ''], {stdout: 'pipe', stderr: 'pipe'});
        expect({code: empty.exitCode, stdout: empty.stdout.length, stderr: empty.stderr.length})
            .toEqual({code: 0, stdout: 0, stderr: 0});
        const asynchronous = nodeReferenceSync(['node', '-e',
            `Promise.resolve().then(()=>console.log('microtask'));setTimeout(()=>console.log('terminal'),0);`],
            {stdout: 'pipe', stderr: 'pipe', timeout: 10000});
        expect({code: asynchronous.exitCode, stdout: asynchronous.stdout.toString(), stderr: asynchronous.stderr.toString()})
            .toEqual({code: 0, stdout: 'microtask\nterminal\n', stderr: ''});
        expect(() => nodeReferenceSync(['bun', '-e', ''], {stdout: 'pipe', stderr: 'pipe'}))
            .toThrow('Node reference capture requires separate file-backed output streams');
        const timed = nodeReferenceSync(['node', '-e', 'setInterval(()=>{},1000)'],
            {stdout: 'pipe', stderr: 'pipe', timeout: 50});
        expect(timed.exitedDueToTimeout).toBe(true);
    } finally { rmSync(root, {recursive: true, force: true}); }
});

test('one large Node reference stream retains complete byte content through explicit exit', () => {
    const length = 1024 * 1024, program = `process.stdout.write('x'.repeat(${length}));console.log('terminal');process.exit(0);`;
    const result = nodeReferenceSync(['node', '-e', program], {stdout: 'pipe', stderr: 'pipe', timeout: 10000});
    expect({code: result.exitCode, stderr: result.stderr.toString(), length: result.stdout.length})
        .toEqual({code: 0, stderr: '', length: length + 'terminal\n'.length});
    expect(result.stdout.subarray(0, length).every(value => value === 120)).toBe(true);
    expect(result.stdout.subarray(length).toString()).toBe('terminal\n');
});
