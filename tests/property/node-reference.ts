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

/** Independent Node references keep their original program and process options.
 * Regular files preserve complete console output before the process exits;
 * returning buffers retains the existing separate-stream assertion contract. */
export function nodeReferenceSync<const In extends Bun.SpawnOptions.Writable = 'ignore'>(
    command: string[], options: ReferenceOptions<In>,
): Bun.ReadableSyncSubprocess {
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
