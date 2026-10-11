function partial(flag: boolean): string | undefined { if (flag) return "607;"; }
console.log(eval(String(partial(false))));
console.log(eval(String(partial(true))));
const first: any = { toString(): never { throw "613;"; } };
const body: any = { toString(): never { throw "unexpected coercion"; } };
const make: any = Function;
try { make(first, body); } catch (source: any) { console.log(eval(source)); }
function overridden(): string { try { return "617;"; } finally { throw "619;"; } }
try { console.log(eval(overridden())); } catch (source: any) { console.log(eval(source)); }
