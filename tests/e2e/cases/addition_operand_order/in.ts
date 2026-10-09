let numberSlot = 1;
function mutateNumber(): number { numberSlot = 9; return 2; }
console.log(numberSlot + mutateNumber(), numberSlot);
let bigintSlot = 1n;
function mutateBigint(): bigint { bigintSlot = 9n; return 2n; }
console.log(String(bigintSlot + mutateBigint()), String(bigintSlot));
const trace: string[] = [];
function operand(label: string, value: any): any {
    trace.push(label + ":expression");
    return { [Symbol.toPrimitive](hint: string): any { trace.push(label + ":" + hint); return value; } };
}
function tail(): any { trace.push("tail:expression"); return "!"; }
const result: any = operand("L", "left") + operand("R", 7) + tail();
console.log(result, trace.join(","));
function wideNumber(): number { const first = 4611686018427387904; const second = first; return first + second; }
console.log(Object.is(wideNumber(), 9223372036854775808));
