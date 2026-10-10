import { marker, maximum, source, tail, blocked } from './source';
async function verify(): Promise<void> {
    const actual = tail();
    console.log('sparse:', source.length === maximum, (source as any)[4000] === marker, actual.length === 2, !(0 in actual), actual[1] === marker);
    console.log('keys:', Object.keys(source).join('|'));
    const removed = source.pop();
    console.log('pop:', removed === marker, source.length === maximum - 1, !(maximum - 1 in source));
    const limited = Reflect.defineProperty(blocked, 'length', { value: 0, writable: false });
    console.log('length:', limited, blocked.length === 2, !(2 in blocked), Object.getOwnPropertyDescriptor(blocked, 'length')!.writable === false);
    await Promise.resolve(marker);
    console.log('retained:', actual[1] === marker, (source as any)[4000] === marker);
    console.log('truncate:', Reflect.set(source, 'length', 0), source.length === 0, Object.keys(source).length === 0);
}
verify().catch((error: any) => { console.log('failure:', String(error)); throw error; });
