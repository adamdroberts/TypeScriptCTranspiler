import { marker, key, Constructor, actual, string, predicate } from './source';
async function verify(): Promise<void> {
    const output = actual(), values = output[0], alias = output[1];
    console.log('values:', values[0] === marker, values[1] === key, values[2] === null, alias[0] === marker, alias[1] === key);
    const text = string('A💡Z');
    console.log('string:', text.length === 3, text[1] === '💡');
    const set = new Set<number>(); set.add(1);
    const live = Constructor.from(set, (value: number): number => { set.add(2); return value; });
    console.log('live:', live.length === 2, live[0] === 1, live[1] === 2);
    const savedFrom: any = Array.from, savedPredicate: any = Array.isArray;
    let calls = 0;
    (Array as any).from = function (this: any, source: any): any { calls++; return [this, source]; };
    const changed = string('text');
    console.log('owner:', calls === 1, changed[0] === Array, changed[1] === 'text');
    (Array as any).from = savedFrom;
    (Array as any).isArray = () => marker;
    console.log('predicate:', predicate(values) === marker);
    (Array as any).isArray = savedPredicate;
    await Promise.resolve(0);
    console.log('retained:', values[0] === marker, alias[1] === key, predicate(values) === true);
}
verify().catch((error: any) => { console.log('failure:', String(error)); throw error; });
