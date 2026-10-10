import { marker, insert, replace, boxed } from './source';
async function verify(): Promise<void> {
    const target: any = { length: 2, 1: 'last' };
    const result = insert(target), owner = result[0];
    console.log('insert:', result[1] === 4, owner[0] === marker, 1 in owner, !(2 in owner), owner[3] === 'last');
    console.log('order:', result[2]);
    const copy = replace(), object = boxed();
    console.log('copy:', copy[0] === marker, copy[1] === 'last');
    console.log('boxed:', typeof object === 'object', object.valueOf() === 7);
    const source: ReadonlyArray<any[]> = [[marker]];
    const flat = source.flat(Infinity);
    console.log('flat:', flat.length === 1, flat[0] === marker);
    await Promise.resolve(marker);
    console.log('retained:', owner[0] === marker, target[3] === 'last', copy[0] === marker);
}
verify().catch((error: any) => { console.log('failure:', String(error)); throw error; });
