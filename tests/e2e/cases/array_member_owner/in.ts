import { marker, key, values, alias, map, pop } from './source';
async function verify(): Promise<void> {
    const mapped = map();
    console.log('map:', mapped.length === 3, mapped[0] === key, !(1 in mapped), mapped[2] === marker);
    console.log('write:', alias === values, (values as any)[2] === marker, (values as any)[3] === marker);
    console.log('missing:', pop([]) === undefined);
    const original: any = Array.prototype.pop;
    let calls = 0;
    (Array.prototype as any).pop = function(this: any): any { calls++; return [this, marker]; };
    const result = pop(values);
    console.log('callee:', calls === 1, result[0] === values, result[1] === marker);
    (Array.prototype as any).pop = original;
    const saved = values.slice;
    const copy = saved.call(values, 0);
    console.log('alias:', copy !== values, copy.length === values.length, !(1 in copy), (copy as any)[2] === marker);
    const frozen: number[] = []; Object.freeze(frozen);
    console.log('empty:', frozen.reverse() === frozen, frozen.sort() === frozen, frozen.fill(marker) === frozen);
    await Promise.resolve(marker);
    console.log('retained:', alias === values, (values as any)[2] === marker, mapped[0] === key);
}
verify().catch((error: any) => { console.log('failure:', String(error)); throw error; });
