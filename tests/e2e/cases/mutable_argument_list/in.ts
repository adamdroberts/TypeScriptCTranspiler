const appended: any[] = ["x"];
appended[1] = "return x + 1;";
const increment: any = Function.apply(null, appended);
console.log(increment(31));

const truncated: any[] = ["return 37;"];
truncated.length = 0;
const empty: any = Function.apply(null, truncated);
console.log(empty());

const source: any[] = ["return 41;"];
const snapshot: any[] = [...source];
source[0] = "return 43;";
const fromSnapshot: any = Function.apply(null, snapshot);
const fromSource: any = Function.apply(null, source);
console.log(fromSnapshot(), fromSource());

function construct(...args: any[]): any {
    args[0] = "x";
    args[1] = "return x + 2;";
    return Function.apply(null, args);
}
const fromRest: any = construct("return 47;");
console.log(fromRest(53));
