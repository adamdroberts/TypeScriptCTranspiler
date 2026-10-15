const owner: RegExp = /before/g;
owner.lastIndex = 3;
const alias: RegExp = owner;
const result: RegExp = owner.compile('(after)', 'ig');
console.log('owner', result === owner, alias.source, alias.flags, alias.lastIndex, alias.exec('AFTER')![1]);
async function main(): Promise<void> {
    const saved = owner.compile;
    const result = Reflect.apply(saved, owner, [await Promise.resolve('retained'), 'g']);
    console.log('saved', result === owner, owner.test('retained'));
}
main();
