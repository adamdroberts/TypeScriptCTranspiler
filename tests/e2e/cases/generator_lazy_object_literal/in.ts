const events: string[] = [];

function mark(label: any): any {
    events.push(String(label));
    return label;
}

// 1. Variable initializer with object literals
function* testVarInit(): Generator<number, any, any> {
    events.push("var init start");

    // Dynamic object literal in variable initializer
    const dyn = { a: 1, b: yield 10, c: "hello" };
    events.push("dyn.b = " + dyn.b);

    // Return with a dynamic object literal containing yield
    return { z: yield 20 };
}

// 2. Assignment RHS with object literals
function* testAssignment(): Generator<number, any, any> {
    events.push("assign start");
    let dyn: any = null;

    // Dynamic RHS in assignment
    dyn = { val: yield 30 };
    events.push("dyn.val = " + dyn.val);

    return "assign end";
}

console.log("--- Test 1: Variable Initializers and Return ---");
const it1 = testVarInit();
events.push("created it1");

const r1 = it1.next(mark("ignored1")); // Should yield 10
console.log("Yield 1:", r1.done, r1.value);

const r2 = it1.next(mark("resumed1")); // Should yield 20
console.log("Yield 2:", r2.done, r2.value);

const r3 = it1.next(mark(true)); // Should return { z: true }
console.log("Return:", r3.done, JSON.stringify(r3.value));

console.log("--- Test 2: Assignment RHS ---");
const it2 = testAssignment();
events.push("created it2");

const a1 = it2.next(mark("ignored2")); // Should yield 30
console.log("Yield 3:", a1.done, a1.value);

const a2 = it2.next(mark("resumed2")); // Should return "assign end"
console.log("Return 2:", a2.done, a2.value);

console.log("--- Events Log ---");
console.log(events.join(" | "));
