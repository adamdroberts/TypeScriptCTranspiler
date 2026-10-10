import { marker, key, tuple, native, string, Boundary, retained } from './source';

async function verify(): Promise<void> {
    delete (native as any)[1];
    console.log('missing:', native[1] === undefined, native[17] === undefined, string[17] === undefined);
    const prototype: any = Object.create(Array.prototype);
    let gets = 0;
    Object.defineProperty(prototype, '1', { get() { gets++; return marker; } });
    Object.setPrototypeOf(native, prototype);
    console.log('inherited:', native[1] === marker, gets === 1, string[1].length === 1, string[2].length === 1);
    const alias: readonly unknown[] = tuple;
    tuple.push(marker, key, null);
    console.log('tuple:', alias === tuple, tuple[0] === undefined, tuple[1] === null, tuple[2] === false,
        tuple[3] === 0, tuple[4] === 'word', tuple[5] === 37n, tuple[6] === key, tuple[7] === marker,
        tuple[8] === marker, tuple[9] === key, tuple[10] === null);
    const pair: [any, any] = [key, marker];
    (pair as any).push(tuple);
    console.log('pair:', (pair as any)[2] === tuple, pair[0] === key, pair[1] === marker);
    const entries: any = Object.entries({ token: marker });
    const boundary = new Boundary();
    console.log('boundary:', boundary.read(entries[0], 'length') === 2,
        boundary.read(entries[0], 0) === 'token', boundary.read(entries[0], 1) === marker);
    const source: [any, any][] = [['token', marker], [key, tuple], ['__proto__', null]];
    const fromEntries = Object.fromEntries;
    const rebuilt: any = fromEntries(source);
    const nativeRebuilt: any = Object.fromEntries(Object.entries({ token: marker }));
    console.log('entries:', rebuilt.token === marker, rebuilt[key] === tuple,
        Object.hasOwn(rebuilt, '__proto__'), Object.getPrototypeOf(rebuilt) === Object.prototype, nativeRebuilt.token === marker);
    let keys = 0;
    function property(): any { keys++; return 1; }
    const absent: any = undefined;
    console.log('optional:', absent?.[property()] === undefined, keys === 0,
        native?.[property()] === marker, keys === 1);
    const read = await retained();
    console.log('retained:', read() === marker, gets === 3);
}
verify().catch((error: any) => { console.log('failure:', String(error)); throw error; });
