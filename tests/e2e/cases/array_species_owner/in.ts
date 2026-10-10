import { marker, calls, Result, source, map } from './source';
async function verify(): Promise<void> {
    const mapped = map();
    console.log('map:', calls === 1, !Array.isArray(mapped), mapped.created === true, mapped.length === 3, mapped[0] === 2, !(1 in mapped), mapped[2] === 3);
    const sliced = source.slice(0, 2);
    console.log('slice:', calls === 2, !Array.isArray(sliced), sliced.length === 2, sliced[0] === 1, !(1 in sliced));
    const removed = source.splice(0, 1, marker);
    console.log('splice:', calls === 3, !Array.isArray(removed), removed.length === 1, removed[0] === 1, (source as any)[0] === marker);
    const ordinary = source.with(0, 3);
    console.log('copy:', calls === 3, Array.isArray(ordinary), ordinary[0] === 3);
    await Promise.resolve(marker);
    console.log('retained:', calls === 3, mapped[2] === 3, sliced[0] === 1, removed[0] === 1, (source as any)[0] === marker);
}
verify().catch((error: any) => { console.log('failure:', String(error)); throw error; });
