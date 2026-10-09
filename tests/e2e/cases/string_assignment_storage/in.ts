let trace = "";
function append(): void { trace += "global"; }
append(); console.log(trace);
function local(): string {
    let text = "";
    text += (1 + 2);
    text = text + (4 + 5);
    const value: any = { [Symbol.toPrimitive](hint: string): string { return ":" + hint; } };
    text += value;
    return text;
}
console.log(local());
function captured(): string {
    let text = "";
    const mutate = (): string => { text = text + "inner"; return "outer"; };
    text += mutate();
    return text;
}
console.log(captured());
function abrupt(): string {
    let text = "";
    const reason: any = {};
    const value: any = { [Symbol.toPrimitive](): any { throw reason; } };
    try { text = text + "partial" + value; }
    catch (error) { return Object.is(error, reason) + ":" + text.length; }
    return "missing";
}
console.log(abrupt());
