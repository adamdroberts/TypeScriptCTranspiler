let branchCalls = 0;

function branch(value: number): number {
    branchCalls++;
    return value;
}

function* conditionalReturn(): Generator<string, number, boolean> {
    return (yield "condition") ? branch(10) : branch(20);
}

const trueIterator = conditionalReturn();
const trueFirst: any = trueIterator.next();
console.log("true-before", branchCalls, trueFirst.done, trueFirst.value);
const trueDone: any = trueIterator.next(true);
console.log("true-done", branchCalls, trueDone.done, trueDone.value);

const falseIterator = conditionalReturn();
const falseFirst: any = falseIterator.next();
console.log("false-before", branchCalls, falseFirst.done, falseFirst.value);
const falseDone: any = falseIterator.next(false);
console.log("false-done", branchCalls, falseDone.done, falseDone.value);
