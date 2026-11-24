import {mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {basename, join} from 'node:path';

type ReferenceOptions<In extends Bun.SpawnOptions.Writable> =
    Omit<Bun.SpawnOptions.SpawnSyncOptions<In, 'pipe', 'pipe'>, 'stdio' | 'maxBuffer' | 'onExit' | 'ipc'> & {
        stdio?: never;
        maxBuffer?: never;
        onExit?: never;
        ipc?: never;
    };

/** The reference Node executable: TSC2C_NODE_REFERENCE when set, otherwise
 * `node` on PATH. Oracles spawned directly use it, as nodeReferenceSync does. */
export function referenceNode(): string {
    return process.env.TSC2C_NODE_REFERENCE || 'node';
}

/** Independent Node references keep their original program and process options.
 * A bare `node` command resolves to TSC2C_NODE_REFERENCE when that is set, so
 * one environment variable selects the reference Node for every test.
 * Regular files preserve complete console output before the process exits;
 * returning buffers retains the existing separate-stream assertion contract. */
export function nodeReferenceSync<const In extends Bun.SpawnOptions.Writable = 'ignore'>(
    command: string[], options: ReferenceOptions<In>,
): Bun.ReadableSyncSubprocess {
    if (command[0] === 'node' && process.env.TSC2C_NODE_REFERENCE) command = [process.env.TSC2C_NODE_REFERENCE, ...command.slice(1)];
    if (!command[0] || !/^node(?:\.exe)?$/.test(basename(command[0])) ||
        options.stdio !== undefined || options.maxBuffer !== undefined ||
        options.onExit !== undefined || options.ipc !== undefined) {
        throw new Error('Node reference capture requires separate file-backed output streams');
    }
    const root = mkdtempSync(join(tmpdir(), 'tsc2c-node-reference-'));
    try {
        const stdout = join(root, 'stdout'), stderr = join(root, 'stderr');
        writeFileSync(stdout, ''); writeFileSync(stderr, '');
        const result = Bun.spawnSync(command, {...options, stdout: Bun.file(stdout), stderr: Bun.file(stderr)});
        return {...result, stdout: readFileSync(stdout), stderr: readFileSync(stderr)};
    } finally { rmSync(root, {recursive: true, force: true}); }
}

/** Which of `sources` the reference Node parses as a Script (new vm.Script
 * succeeds; a SyntaxError rejects), all in one process. A grammar oracle that
 * runs vm inside the Bun test process would use Bun's parser instead. */
export function nodeAcceptsScripts(sources: readonly string[]): boolean[] {
    const root = mkdtempSync(join(tmpdir(), 'tsc2c-node-grammar-'));
    try {
        const input = join(root, 'sources.json');
        writeFileSync(input, JSON.stringify(sources));
        const result = nodeReferenceSync(['node', '-e', `const vm = require("node:vm"), fs = require("node:fs");
const out = JSON.parse(fs.readFileSync(process.argv[1], "utf8")).map(source => {
    try { new vm.Script(source); return true; } catch (error) { if (error instanceof SyntaxError) return false; throw error; }
});
fs.writeFileSync(1, JSON.stringify(out));`, input], {stdout: 'pipe', stderr: 'pipe', timeout: 120_000});
        if (result.exitCode !== 0) throw new Error(`Node grammar oracle failed: ${result.stderr.toString()}`);
        const accepted = JSON.parse(result.stdout.toString()) as boolean[];
        if (accepted.length !== sources.length) throw new Error('Node grammar oracle returned a different count');
        return accepted;
    } finally { rmSync(root, {recursive: true, force: true}); }
}
