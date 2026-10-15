const depth = 128;
const owner: any = { value: 17 };
let graph: any = owner;
for (let index = 0; index < depth; index++) graph = { previous: graph };
function retained(value: any): any {
    for (let index = 0; index < depth; index++) value = value.previous;
    return value;
}
async function main(): Promise<void> {
    const saved = owner.value;
    const resolved = await Promise.resolve(graph).then(value => retained(value));
    const current = resolved.value;
    let trace = '';
    const thenable: any = { get then() { trace += 'G'; return function(resolve: any) { trace += 'C'; owner.value = 19; resolve(graph); }; } };
    const again: any = await Promise.resolve(thenable);
    console.log('activation graph:', resolved === owner, retained(again) === owner, saved, current, owner.value, trace);
}
main();
