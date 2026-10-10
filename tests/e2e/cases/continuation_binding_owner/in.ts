import { marker, replacement, key, makeAppender, owner, sequence, asynchronous, nested } from './source';
async function verify(): Promise<void> {
    const append = makeAppender('start:');
    const firstText = await append('A', 'B'), secondText = await append('C', 'D');
    console.log('formal:', firstText, secondText);
    const cells = owner(marker), actual = await cells[0](), retained = actual[4](), outer = cells[1]();
    console.log('cells:', actual[0] === null, actual[1] === replacement, actual[2] === key, actual[3] === marker,
        retained[0] === null, retained[1] === replacement, outer[2] === key, outer[3] === marker);
    const iterator = sequence(marker)();
    console.log('generator:', iterator.next().value === marker, iterator.next().value === replacement);
    const asyncIterator = asynchronous(marker)();
    const firstResult = await asyncIterator.next(), secondResult = await asyncIterator.next();
    console.log('async generator:', firstResult.value === marker, secondResult.value === key);
    const next = await nested(marker)(), read = await next();
    console.log('nested:', read() === key);
}
verify().catch((error: any) => { console.log('failure:', String(error)); throw error; });
