function factory(prefix: string): any {
    const before: any = entry;
    let value: string = prefix;
    function entry(suffix: string): any { return value + suffix; }
    function update(next: string): void { value = next; }
    return { before, entry, update };
}
const left: any = factory("A"), right: any = factory("B");
console.log(left.before === left.entry, left.entry !== right.entry, left.entry("!"), right.entry("!"));
left.update("C"); console.log(left.before("?"));
function recursive(prefix: string): any {
    return visit;
    function visit(depth: number): any { return depth ? visit(depth - 1) : prefix; }
}
console.log(recursive("retained")(11));
const closureFactory: any = function (prefix: string): any {
    return entry;
    function entry(): any { return prefix; }
};
console.log(closureFactory("closure")());
function varFactory(prefix: string): any {
    const before: any = entry;
    var value: any = prefix;
    function entry(): any { return value; }
    var value: any;
    return before;
}
console.log(varFactory("captured-var")());
async function suspended(prefix: string): Promise<any> {
    const before: any = entry;
    await Promise.resolve(1);
    let value: string = prefix;
    function entry(): any { return value; }
    await Promise.resolve(2);
    value += "!";
    return [before, entry];
}
suspended("async").then((pair: any): void => console.log(pair[0] === pair[1], pair[0]()));
