import * as os from "os";
import { getPriority, setPriority, constants } from "os";
import * as nodeOs from "node:os";

// 1. Priority constants
console.log("constants.priority.PRIORITY_LOW:", constants.priority.PRIORITY_LOW);
console.log("constants.priority.PRIORITY_BELOW_NORMAL:", constants.priority.PRIORITY_BELOW_NORMAL);
console.log("constants.priority.PRIORITY_NORMAL:", constants.priority.PRIORITY_NORMAL);
console.log("constants.priority.PRIORITY_ABOVE_NORMAL:", constants.priority.PRIORITY_ABOVE_NORMAL);
console.log("constants.priority.PRIORITY_HIGH:", constants.priority.PRIORITY_HIGH);
console.log("constants.priority.PRIORITY_HIGHEST:", constants.priority.PRIORITY_HIGHEST);

console.log("nodeOs.constants.priority.PRIORITY_LOW:", nodeOs.constants.priority.PRIORITY_LOW);

// 2. Initial priority check
const initial = os.getPriority();
console.log("Initial priority is a number:", typeof initial === "number");

// 3. Lowering priority (1-argument form: setPriority(priority))
// On Linux/POSIX, any user can lower priority (higher nice value).
// Let's set it to 10 (PRIORITY_BELOW_NORMAL).
os.setPriority(10);
console.log("Priority after setPriority(10):", os.getPriority());

// 4. Lowering priority (2-argument form: setPriority(pid, priority))
// Let's set it to 15.
os.setPriority(0, 15);
console.log("Priority after setPriority(0, 15):", os.getPriority(0));

// 5. Direct imports
console.log("getPriority direct import:", typeof getPriority === "function");
console.log("setPriority direct import:", typeof setPriority === "function");

// 6. Ignored argument evaluation
let sideEffects = 0;
const p = os.getPriority(0, sideEffects++);
os.setPriority(0, 19, sideEffects++);
console.log("Priority after setPriority(0, 19):", os.getPriority());
console.log("sideEffects count:", sideEffects);
