const dyn: any = ["a", "b"];

const dynDefined = Reflect.defineProperty(dyn, "length", { writable: false });
const dynLengthDesc: any = Object.getOwnPropertyDescriptor(dyn, "length");
console.log("dyn define:", dynDefined, dynLengthDesc.writable, dyn.length);
try { dyn.push("c"); } catch (error: any) { console.log("dyn push:", error); }
try { dyn.push(); } catch (error: any) { console.log("dyn empty push:", error); }
try { dyn.pop(); } catch (error: any) { console.log("dyn pop:", error); }
console.log("dyn after pop:", dyn.length, dyn.join("|"), Object.hasOwn(dyn, "1"));
console.log("dyn set index:", Reflect.set(dyn, "2", "c"), dyn.length, dyn[2]);
console.log("dyn shrink:", Reflect.defineProperty(dyn, "length", { value: 1 }), dyn.length);
console.log(
    "dyn same:",
    Reflect.defineProperty(dyn, "length", { value: 2, writable: false }),
    dyn.length,
    Object.getOwnPropertyDescriptor(dyn, "length")!.writable,
);

const dynShift: any = ["a", "b"];
Reflect.defineProperty(dynShift, "length", { writable: false });
try { dynShift.shift(); } catch (error: any) { console.log("dyn shift:", error); }
console.log("dyn after shift:", dynShift.length, dynShift.join("|"), Object.keys(dynShift).join("|"));

const dynUnshift: any = ["a", "b"];
Reflect.defineProperty(dynUnshift, "length", { writable: false });
try { dynUnshift.unshift("z"); } catch (error: any) { console.log("dyn unshift:", error); }
try { dynUnshift.unshift(); } catch (error: any) { console.log("dyn empty unshift:", error); }
console.log("dyn after unshift:", dynUnshift.length, dynUnshift.join("|"));

const dynSplice: any = ["a", "b", "c"];
Reflect.defineProperty(dynSplice, "length", { writable: false });
try { dynSplice.splice(0, 1); } catch (error: any) { console.log("dyn splice:", error); }
console.log("dyn after splice:", dynSplice.length, dynSplice.join("|"), Object.keys(dynSplice).join("|"));
try { dynSplice.splice(); } catch (error: any) { console.log("dyn empty splice:", error); }

const typed = [1, 2];

const typedDefined = Reflect.defineProperty(typed, "length", { writable: false });
const typedLengthDesc: any = Object.getOwnPropertyDescriptor(typed, "length");
console.log("typed define:", typedDefined, typedLengthDesc.writable, typed.length);
try { typed.push(3); } catch (error: any) { console.log("typed push:", error); }
try { typed.push(); } catch (error: any) { console.log("typed empty push:", error); }
try { typed.pop(); } catch (error: any) { console.log("typed pop:", error); }
console.log("typed after pop:", typed.length, typed.join("|"), Object.hasOwn(typed, "1"));
console.log("typed set index:", Reflect.set(typed, "2", 3), typed.length, typed[2]);
console.log("typed shrink:", Reflect.defineProperty(typed, "length", { value: 1 }), typed.length);
console.log(
    "typed same:",
    Reflect.defineProperty(typed, "length", { value: 2, writable: false }),
    typed.length,
    Object.getOwnPropertyDescriptor(typed, "length")!.writable,
);

const typedShift = [1, 2];
Reflect.defineProperty(typedShift, "length", { writable: false });
try { typedShift.shift(); } catch (error: any) { console.log("typed shift:", error); }
console.log("typed after shift:", typedShift.length, typedShift.join("|"), Object.keys(typedShift).join("|"));

const typedUnshift = [1, 2];
Reflect.defineProperty(typedUnshift, "length", { writable: false });
try { typedUnshift.unshift(0); } catch (error: any) { console.log("typed unshift:", error); }
try { typedUnshift.unshift(); } catch (error: any) { console.log("typed empty unshift:", error); }
console.log("typed after unshift:", typedUnshift.length, typedUnshift.join("|"));

const typedSplice = [1, 2, 3];
Reflect.defineProperty(typedSplice, "length", { writable: false });
try { typedSplice.splice(0, 1); } catch (error: any) { console.log("typed splice:", error); }
console.log("typed after splice:", typedSplice.length, typedSplice.join("|"), Object.keys(typedSplice).join("|"));
try { typedSplice.splice(); } catch (error: any) { console.log("typed empty splice:", error); }
