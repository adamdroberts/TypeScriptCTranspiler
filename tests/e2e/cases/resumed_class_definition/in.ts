import { memberKey, makeGenerator, makeOwner, repeatedOwners, patternedOwner } from './owner';
async function verify(): Promise<void> {
    const label = Symbol('label');
    const sequence = makeGenerator(label);
    console.log('generator-pause:' + (sequence.next().value === 'pause'));
    const Local = sequence.next().value;
    const local = new Local();
    const localSelf = await Local.later();
    console.log('generator-capture:' + (local[memberKey]() === label && Local.self() === Local && localSelf === Local));
    const Named = await makeOwner(label);
    const named = new Named();
    const namedSelf = await Named.later();
    console.log('async-expression:' + (named[memberKey]() === label && Named.self() === Named && namedSelf === Named));
    const owners = repeatedOwners(label);
    const First = (await owners.next()).value;
    const first = new First();
    const Second = (await owners.next()).value;
    const second = new Second();
    console.log('async-generator-capture:' + (first[memberKey]() === label && second[memberKey]() === label && first.index() === 0 && second.index() === 1));
    console.log('fresh-inner-name:' + (First !== Second && First.self() === First && Second.self() === Second));
    const bound = await patternedOwner([], { owner: { value: label } }, memberKey, label);
    const Constructor = bound[0];
    const owner = new Constructor();
    const later = await owner.later();
    console.log('pattern-formals:' + (Constructor.name === 'Constructor' && owner[memberKey]() === label && later === label && bound[1] === label && bound[2][0] === memberKey && bound[2][1] === label));
}
verify().catch((error: any) => { console.log('failure:' + String(error)); throw error; });
