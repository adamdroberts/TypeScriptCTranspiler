const dyn: any = ["a", "b"];

const dynDefined = Reflect.defineProperty(dyn, "length", { writable: false });
const dynLengthDesc: any = Object.getOwnPropertyDescriptor(dyn, "length");
console.log("dyn define:", dynDefined, dynLengthDesc.writable, dyn.length);
try { dyn.push("c"); } catch (error: any) { console.log("dyn push:", error); }
try { dyn.push(); } catch (error: any) { console.log("dyn empty push:", error); }
console.log("dyn set index:", Reflect.set(dyn, "2", "c"), dyn.length, dyn[2]);
console.log("dyn shrink:", Reflect.defineProperty(dyn, "length", { value: 1 }), dyn.length);
console.log(
    "dyn same:",
    Reflect.defineProperty(dyn, "length", { value: 2, writable: false }),
    dyn.length,
    Object.getOwnPropertyDescriptor(dyn, "length")!.writable,
);

const typed = [1, 2];

const typedDefined = Reflect.defineProperty(typed, "length", { writable: false });
const typedLengthDesc: any = Object.getOwnPropertyDescriptor(typed, "length");
console.log("typed define:", typedDefined, typedLengthDesc.writable, typed.length);
try { typed.push(3); } catch (error: any) { console.log("typed push:", error); }
try { typed.push(); } catch (error: any) { console.log("typed empty push:", error); }
console.log("typed set index:", Reflect.set(typed, "2", 3), typed.length, typed[2]);
console.log("typed shrink:", Reflect.defineProperty(typed, "length", { value: 1 }), typed.length);
console.log(
    "typed same:",
    Reflect.defineProperty(typed, "length", { value: 2, writable: false }),
    typed.length,
    Object.getOwnPropertyDescriptor(typed, "length")!.writable,
);
