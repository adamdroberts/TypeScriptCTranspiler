function* sum(): Generator<number, number, number> {
    return (yield 10) + (yield 20);
}

function* bits(): Generator<number, number, number> {
    return (yield 8) & (yield 3);
}

function* chain(): Generator<number, number, number> {
    return (yield 1) + (yield 2) + (yield 3) + (yield 4);
}

function* longChain(): Generator<number, number, number> {
    return (yield 1) + (yield 2) + (yield 3) + (yield 4) + (yield 5) + (yield 6) + (yield 7) + (yield 8) + (yield 9) + (yield 10);
}

function* mixedLeaves(): Generator<number, number, number> {
    return 100 + (yield 1) + (yield 2) * 10;
}

function* unaryLeaves(): Generator<number, number, number> {
    return -(yield 5) + ~(yield 2);
}

function* booleanUnaryLeaves(): Generator<any, any, any> {
    return !(yield 0) + (yield 2);
}

function* typeofLeaves(): Generator<number, string, number> {
    return typeof (yield 7) + (yield 8);
}

function* comparisonLeaves(): Generator<number, boolean, number> {
    return (yield 9) < (yield 10);
}

function* equalityLeaves(): Generator<number, boolean, number> {
    return (yield 11) === (yield 12);
}

function* exponentLeaves(): Generator<number, number, number> {
    return (yield 13) ** (yield 14);
}

function* commaLeaves(): Generator<number, number, number> {
    return (yield 18), (yield 19);
}

function* inLeaves(): Generator<any, boolean, any> {
    return (yield "x") in (yield { x: 1 });
}

function* voidLeaves(): Generator<number, number, number> {
    return (void (yield 20)), (yield 21);
}

class InstanceMarker {}

function* instanceLeaves(): Generator<any, boolean, any> {
    return (yield new InstanceMarker()), (yield new InstanceMarker()) instanceof InstanceMarker;
}

function* parameterLeaves(offset: number): Generator<number, number, number> {
    return offset + (yield 22) + (yield 23);
}

function* localLeaves(): Generator<number, number, number> {
    const base = 10;
    return base + (yield 30) + (yield 31);
}

function* immutableLetLeaves(): Generator<number, number, number> {
    let base = 11;
    return base + (yield 32) + (yield 33);
}

function* mutableLetLeaves(): Generator<number, number, number> {
    let base = 11;
    const first = yield 32;
    base += first;
    return base + (yield 33) + (yield 34);
}

function* assignedLetLeaves(): Generator<number, number, number> {
    let base: number;
    const first = yield 35;
    base = first + 2;
    return base + (yield 36) + (yield 37);
}

function* assignedVarLeaves(): Generator<number, number, number> {
    var base: number;
    const first = yield 38;
    base = first + 3;
    return base + (yield 39) + (yield 40);
}

function* initializedVarLeaves(): Generator<number, number, number> {
    var base = 12;
    base += 2;
    return base + (yield 41) + (yield 42);
}

const sideLeafEvents: string[] = [];

function sideLeaf(): number {
    sideLeafEvents.push("side-leaf");
    return 5;
}

function* sideEffectingLeaves(): Generator<number, number, number> {
    return (yield 43) + sideLeaf() + (yield 44);
}

let updateLeafCounter = 0;

function* updateLeaves(): Generator<number, number, number> {
    return (yield 45) + updateLeafCounter++ + (yield 46);
}

let prefixLeafCounter = 0;

function* prefixUpdateLeaves(): Generator<number, number, number> {
    return (yield 47) + (++prefixLeafCounter) + (yield 48);
}

const deleteLeafObject: any = { value: 1 };

function* deleteLeaves(): Generator<number, number, number> {
    return (yield 53) + (delete deleteLeafObject.value, 1) + (yield 54);
}

let assignmentLeafCounter = 0;

function* assignmentLeaves(): Generator<number, number, number> {
    return (yield 55) + (assignmentLeafCounter += 2) + (yield 56);
}

let conditionalLeafCounter = 0;

function conditionalLeaf(): number {
    conditionalLeafCounter++;
    return 7;
}

function* conditionalLeaves(): Generator<number, number, number> {
    return (yield 57) + (conditionalLeafCounter === 0 ? conditionalLeaf() : 1) + (yield 58);
}

let templateLeafCounter = 0;

function templateLeaf(): string {
    templateLeafCounter++;
    return "mid";
}

function* templateLeaves(): Generator<string, string, string> {
    return (yield "left") + `${templateLeaf()}` + (yield "right");
}

let taggedLeafCounter = 0;

function taggedLeaf(_strings: TemplateStringsArray): string {
    taggedLeafCounter++;
    return "tag";
}

function* taggedTemplateLeaves(): Generator<string, string, string> {
    return (yield "left") + taggedLeaf`mid` + (yield "right");
}

function* literalLeaves(): Generator<number, number, number> {
    return (yield 61) + [1, 2].length + ({ value: 4 }).value + (yield 62);
}

function* regexpLeaves(): Generator<number, number, number> {
    return (yield 63) + /ab/.source.length + (yield 64);
}

let logicalLeafCounter = 0;
const logicalCondition: string = "yes";

function logicalLeaf(): string {
    logicalLeafCounter++;
    return "mid";
}

function* logicalLeaves(): Generator<string, string, string> {
    return (yield "left") + (logicalCondition && logicalLeaf()) + (yield "right");
}

let nullishLeafCounter = 0;
const nullishLeafValue: string | null = null;

function nullishLeaf(): string {
    nullishLeafCounter++;
    return "mid";
}

function* nullishLeaves(): Generator<string, string, string> {
    return (yield "left") + (nullishLeafValue ?? nullishLeaf()) + (yield "right");
}

let dynamicLogicalLeafCounter = 0;
const dynamicLogicalCondition: any = true;

function dynamicLogicalLeaf(): any {
    dynamicLogicalLeafCounter++;
    return "mid";
}

function* dynamicLogicalLeaves(): Generator<string, string, string> {
    return (yield "left") + (dynamicLogicalCondition && dynamicLogicalLeaf()) + (yield "right");
}

function* optionalPropertyLeaves(): Generator<any, boolean, any> {
    return (yield null)?.value === (yield { value: 1 }).value;
}

function* optionalElementLeaves(): Generator<any, boolean, any> {
    return (yield null)?.[0] === (yield [1])[0];
}

let newLeafCounter = 0;

class NewLeaf {
    value = 7;

    constructor() {
        newLeafCounter++;
    }
}

function* newLeaves(): Generator<number, number, number> {
    return (yield 73) + new NewLeaf().value + (yield 74);
}

function* globalLeaves(): Generator<number, number, number> {
    return (yield 34) + NaN + (yield 35);
}

function* infinityLeaves(): Generator<number, number, number> {
    return (yield 36) + Infinity + (yield 37);
}

function makeCapturedGenerator(offset: number): () => Generator<number, number, number> {
    return function* capturedLeaves(): Generator<number, number, number> {
        return offset + (yield 40) + (yield 41);
    };
}

function makeCapturedLocalGenerator(): () => Generator<number, number, number> {
    const base = 13;
    return function* capturedLocalLeaves(): Generator<number, number, number> {
        return base + (yield 42) + (yield 43);
    };
}

function makeCapturedMutableGenerator(): [() => Generator<number, number, number>, () => void] {
    let base = 13;
    return [
        function* capturedMutableLeaves(): Generator<number, number, number> {
            return base + (yield 44) + (yield 45);
        },
        () => { base = 20; },
    ];
}

function makeCapturedDelegator(source: number[]): () => Generator<number, string, undefined> {
    return function* capturedDelegator(): Generator<number, string, undefined> {
        yield* source;
        return "captured-delegation";
    };
}

class ThisLeaves {
    marker = 9;
    items = [7, 8];

    *values(): Generator<number, ThisLeaves, number> {
        return (yield 26), (yield 27), this;
    }

    *propertyValues(): Generator<number, number, number> {
        return this.marker + (yield 46) + (yield 47);
    }

    *elementValues(): Generator<number, number, number> {
        return this.items[1] + (yield 48) + (yield 49);
    }

    *computedElementValues(): Generator<number, number, number> {
        return this.items[yield 50] + (yield 51) + (yield 52);
    }
}

const iter = sum();
const first: any = iter.next();
const second: any = iter.next(3);
const done: any = iter.next(4);
console.log("steps", first.done, first.value, second.done, second.value, done.done, done.value);
const bitIter = bits();
const bitFirst: any = bitIter.next();
const bitSecond: any = bitIter.next(6);
const bitDone: any = bitIter.next(3);
console.log("bits", bitFirst.value, bitSecond.value, bitDone.done, bitDone.value);
const chainIter = chain();
const chainFirst: any = chainIter.next();
const chainSecond: any = chainIter.next(1);
const chainThird: any = chainIter.next(2);
const chainFourth: any = chainIter.next(3);
const chainDone: any = chainIter.next(4);
console.log("chain", chainFirst.value, chainSecond.value, chainThird.value, chainFourth.value, chainDone.done, chainDone.value);
const longIter = longChain();
const longValues: any[] = [];
longValues.push(longIter.next());
longValues.push(longIter.next(1));
longValues.push(longIter.next(2));
longValues.push(longIter.next(3));
longValues.push(longIter.next(4));
longValues.push(longIter.next(5));
longValues.push(longIter.next(6));
longValues.push(longIter.next(7));
longValues.push(longIter.next(8));
longValues.push(longIter.next(9));
longValues.push(longIter.next(10));
console.log("long", longValues.map((step: any) => step.value).join(","), longValues[10].done, longValues[10].value);
const mixedIter = mixedLeaves();
const mixedFirst: any = mixedIter.next();
const mixedSecond: any = mixedIter.next(3);
const mixedDone: any = mixedIter.next(4);
console.log("mixed", mixedFirst.value, mixedSecond.value, mixedDone.done, mixedDone.value);
const unaryIter = unaryLeaves();
const unaryFirst: any = unaryIter.next();
const unarySecond: any = unaryIter.next(3);
const unaryDone: any = unaryIter.next(1);
console.log("unary", unaryFirst.value, unarySecond.value, unaryDone.done, unaryDone.value);
const booleanUnaryIter = booleanUnaryLeaves();
const booleanUnaryFirst: any = booleanUnaryIter.next();
const booleanUnarySecond: any = booleanUnaryIter.next(0);
const booleanUnaryDone: any = booleanUnaryIter.next(2);
console.log("boolean-unary", booleanUnaryFirst.value, booleanUnarySecond.value, booleanUnaryDone.done, booleanUnaryDone.value);
const typeofIter = typeofLeaves();
const typeofFirst: any = typeofIter.next();
const typeofSecond: any = typeofIter.next(1);
const typeofDone: any = typeofIter.next(2);
console.log("typeof", typeofFirst.value, typeofSecond.value, typeofDone.done, typeofDone.value);
const comparisonIter = comparisonLeaves();
const comparisonFirst: any = comparisonIter.next();
const comparisonSecond: any = comparisonIter.next(1);
const comparisonDone: any = comparisonIter.next(3);
console.log("comparison", comparisonFirst.value, comparisonSecond.value, comparisonDone.done, comparisonDone.value);
const equalityIter = equalityLeaves();
const equalityFirst: any = equalityIter.next();
const equalitySecond: any = equalityIter.next(4);
const equalityDone: any = equalityIter.next(4);
console.log("equality", equalityFirst.value, equalitySecond.value, equalityDone.done, equalityDone.value);
const exponentIter = exponentLeaves();
const exponentFirst: any = exponentIter.next();
const exponentSecond: any = exponentIter.next(2);
const exponentDone: any = exponentIter.next(3);
console.log("exponent", exponentFirst.value, exponentSecond.value, exponentDone.done, exponentDone.value);
const commaIter = commaLeaves();
const commaFirst: any = commaIter.next();
const commaSecond: any = commaIter.next(4);
const commaDone: any = commaIter.next(4);
console.log("comma", commaFirst.value, commaSecond.value, commaDone.done, commaDone.value);
const inIter = inLeaves();
const inFirst: any = inIter.next();
const inSecond: any = inIter.next("x");
const inDone: any = inIter.next({ x: 1 });
console.log("in", inFirst.value, inSecond.value.x, inDone.done, inDone.value);
const voidIter = voidLeaves();
const voidFirst: any = voidIter.next();
const voidSecond: any = voidIter.next(4);
const voidDone: any = voidIter.next(5);
console.log("void", voidFirst.value, voidSecond.value, voidDone.done, voidDone.value);
const instanceIter = instanceLeaves();
const instanceFirst: any = instanceIter.next();
const instanceSecond: any = instanceIter.next(new InstanceMarker());
const instanceDone: any = instanceIter.next(new InstanceMarker());
console.log("instanceof", instanceFirst.done, instanceSecond.done, instanceDone.done, instanceDone.value);
const parameterIter = parameterLeaves(10);
const parameterFirst: any = parameterIter.next();
const parameterSecond: any = parameterIter.next(2);
const parameterDone: any = parameterIter.next(3);
console.log("parameter", parameterFirst.value, parameterSecond.value, parameterDone.done, parameterDone.value);
const localIter = localLeaves();
const localFirst: any = localIter.next();
const localSecond: any = localIter.next(4);
const localDone: any = localIter.next(5);
console.log("local", localFirst.value, localSecond.value, localDone.done, localDone.value);
const immutableLetIter = immutableLetLeaves();
const immutableLetFirst: any = immutableLetIter.next();
const immutableLetSecond: any = immutableLetIter.next(4);
const immutableLetDone: any = immutableLetIter.next(5);
console.log("immutable-let", immutableLetFirst.value, immutableLetSecond.value, immutableLetDone.done, immutableLetDone.value);
const mutableLetIter = mutableLetLeaves();
const mutableLetFirst: any = mutableLetIter.next();
const mutableLetSecond: any = mutableLetIter.next(4);
const mutableLetThird: any = mutableLetIter.next(5);
const mutableLetDone: any = mutableLetIter.next(6);
console.log("mutable-let", mutableLetFirst.value, mutableLetSecond.value, mutableLetThird.value, mutableLetDone.done, mutableLetDone.value);
const assignedLetIter = assignedLetLeaves();
const assignedLetFirst: any = assignedLetIter.next();
const assignedLetSecond: any = assignedLetIter.next(4);
const assignedLetThird: any = assignedLetIter.next(5);
const assignedLetDone: any = assignedLetIter.next(6);
console.log("assigned-let", assignedLetFirst.value, assignedLetSecond.value, assignedLetThird.value, assignedLetDone.done, assignedLetDone.value);
const assignedVarIter = assignedVarLeaves();
const assignedVarFirst: any = assignedVarIter.next();
const assignedVarSecond: any = assignedVarIter.next(4);
const assignedVarThird: any = assignedVarIter.next(5);
const assignedVarDone: any = assignedVarIter.next(6);
console.log("assigned-var", assignedVarFirst.value, assignedVarSecond.value, assignedVarThird.value, assignedVarDone.done, assignedVarDone.value);
const initializedVarIter = initializedVarLeaves();
const initializedVarFirst: any = initializedVarIter.next();
const initializedVarSecond: any = initializedVarIter.next(5);
const initializedVarDone: any = initializedVarIter.next(6);
console.log("initialized-var", initializedVarFirst.value, initializedVarSecond.value, initializedVarDone.done, initializedVarDone.value);
const sideLeafIter = sideEffectingLeaves();
const sideLeafFirst: any = sideLeafIter.next();
const sideLeafSecond: any = sideLeafIter.next(4);
const sideLeafDone: any = sideLeafIter.next(6);
console.log("side-leaf", sideLeafFirst.value, sideLeafSecond.value, sideLeafDone.done, sideLeafDone.value, sideLeafEvents.join("|"));
const updateLeafIter = updateLeaves();
const updateLeafFirst: any = updateLeafIter.next();
const updateLeafSecond: any = updateLeafIter.next(2);
const updateLeafDone: any = updateLeafIter.next(3);
console.log("update-leaf", updateLeafFirst.value, updateLeafSecond.value, updateLeafDone.done, updateLeafDone.value, updateLeafCounter);
const prefixLeafIter = prefixUpdateLeaves();
const prefixLeafFirst: any = prefixLeafIter.next();
const prefixLeafSecond: any = prefixLeafIter.next(2);
const prefixLeafDone: any = prefixLeafIter.next(3);
console.log("prefix-leaf", prefixLeafFirst.value, prefixLeafSecond.value, prefixLeafDone.done, prefixLeafDone.value, prefixLeafCounter);
const deleteLeafIter = deleteLeaves();
const deleteLeafFirst: any = deleteLeafIter.next();
const deleteLeafSecond: any = deleteLeafIter.next(2);
console.log("delete-leaf-before", deleteLeafFirst.value, deleteLeafSecond.value, deleteLeafObject.value);
const deleteLeafDone: any = deleteLeafIter.next(3);
console.log("delete-leaf", deleteLeafDone.done, deleteLeafDone.value, deleteLeafObject.value);
const assignmentLeafIter = assignmentLeaves();
const assignmentLeafFirst: any = assignmentLeafIter.next();
const assignmentLeafSecond: any = assignmentLeafIter.next(2);
console.log("assignment-leaf-before", assignmentLeafFirst.value, assignmentLeafSecond.value, assignmentLeafCounter);
const assignmentLeafDone: any = assignmentLeafIter.next(3);
console.log("assignment-leaf", assignmentLeafDone.done, assignmentLeafDone.value, assignmentLeafCounter);
const conditionalLeafIter = conditionalLeaves();
const conditionalLeafFirst: any = conditionalLeafIter.next();
const conditionalLeafSecond: any = conditionalLeafIter.next(2);
console.log("conditional-leaf-before", conditionalLeafFirst.value, conditionalLeafSecond.value, conditionalLeafCounter);
const conditionalLeafDone: any = conditionalLeafIter.next(3);
console.log("conditional-leaf", conditionalLeafDone.done, conditionalLeafDone.value, conditionalLeafCounter);
const templateLeafIter = templateLeaves();
const templateLeafFirst: any = templateLeafIter.next();
const templateLeafSecond: any = templateLeafIter.next("A");
console.log("template-leaf-before", templateLeafFirst.value, templateLeafSecond.value, templateLeafCounter);
const templateLeafDone: any = templateLeafIter.next("B");
console.log("template-leaf", templateLeafDone.done, templateLeafDone.value, templateLeafCounter);
const taggedTemplateLeafIter = taggedTemplateLeaves();
const taggedTemplateLeafFirst: any = taggedTemplateLeafIter.next();
const taggedTemplateLeafSecond: any = taggedTemplateLeafIter.next("A");
console.log("tagged-template-leaf-before", taggedTemplateLeafFirst.value, taggedTemplateLeafSecond.value, taggedLeafCounter);
const taggedTemplateLeafDone: any = taggedTemplateLeafIter.next("B");
console.log("tagged-template-leaf", taggedTemplateLeafDone.done, taggedTemplateLeafDone.value, taggedLeafCounter);
const literalLeafIter = literalLeaves();
const literalLeafFirst: any = literalLeafIter.next();
const literalLeafSecond: any = literalLeafIter.next(2);
console.log("literal-leaf", literalLeafFirst.value, literalLeafSecond.value);
const literalLeafDone: any = literalLeafIter.next(3);
console.log("literal-leaf-done", literalLeafDone.done, literalLeafDone.value);
const regexpLeafIter = regexpLeaves();
const regexpLeafFirst: any = regexpLeafIter.next();
const regexpLeafSecond: any = regexpLeafIter.next(2);
console.log("regexp-leaf", regexpLeafFirst.value, regexpLeafSecond.value);
const regexpLeafDone: any = regexpLeafIter.next(3);
console.log("regexp-leaf-done", regexpLeafDone.done, regexpLeafDone.value);
const logicalLeafIter = logicalLeaves();
const logicalLeafFirst: any = logicalLeafIter.next();
const logicalLeafSecond: any = logicalLeafIter.next("A");
console.log("logical-leaf-before", logicalLeafFirst.value, logicalLeafSecond.value, logicalLeafCounter);
const logicalLeafDone: any = logicalLeafIter.next("B");
console.log("logical-leaf", logicalLeafDone.done, logicalLeafDone.value, logicalLeafCounter);
const nullishLeafIter = nullishLeaves();
const nullishLeafFirst: any = nullishLeafIter.next();
const nullishLeafSecond: any = nullishLeafIter.next("A");
console.log("nullish-leaf-before", nullishLeafFirst.value, nullishLeafSecond.value, nullishLeafCounter);
const nullishLeafDone: any = nullishLeafIter.next("B");
console.log("nullish-leaf", nullishLeafDone.done, nullishLeafDone.value, nullishLeafCounter);
const dynamicLogicalLeafIter = dynamicLogicalLeaves();
const dynamicLogicalLeafFirst: any = dynamicLogicalLeafIter.next();
const dynamicLogicalLeafSecond: any = dynamicLogicalLeafIter.next("A");
console.log("dynamic-logical-leaf-before", dynamicLogicalLeafFirst.value, dynamicLogicalLeafSecond.value, dynamicLogicalLeafCounter);
const dynamicLogicalLeafDone: any = dynamicLogicalLeafIter.next("B");
console.log("dynamic-logical-leaf", dynamicLogicalLeafDone.done, dynamicLogicalLeafDone.value, dynamicLogicalLeafCounter);
const optionalPropertyLeafIter = optionalPropertyLeaves();
const optionalPropertyLeafFirst: any = optionalPropertyLeafIter.next();
const optionalPropertyLeafSecond: any = optionalPropertyLeafIter.next({ value: 2 });
const optionalPropertyLeafDone: any = optionalPropertyLeafIter.next(3);
console.log("optional-property-leaf", optionalPropertyLeafFirst.value, optionalPropertyLeafSecond.value.value, optionalPropertyLeafDone.done, optionalPropertyLeafDone.value);
const optionalElementLeafIter = optionalElementLeaves();
const optionalElementLeafFirst: any = optionalElementLeafIter.next();
const optionalElementLeafSecond: any = optionalElementLeafIter.next([2]);
const optionalElementLeafDone: any = optionalElementLeafIter.next(3);
console.log("optional-element-leaf", optionalElementLeafFirst.value, optionalElementLeafSecond.value[0], optionalElementLeafDone.done, optionalElementLeafDone.value);
const newLeafIter = newLeaves();
const newLeafFirst: any = newLeafIter.next();
const newLeafSecond: any = newLeafIter.next(2);
console.log("new-leaf-before", newLeafFirst.value, newLeafSecond.value, newLeafCounter);
const newLeafDone: any = newLeafIter.next(3);
console.log("new-leaf", newLeafDone.done, newLeafDone.value, newLeafCounter);
const globalIter = globalLeaves();
const globalFirst: any = globalIter.next();
const globalSecond: any = globalIter.next(4);
const globalDone: any = globalIter.next(5);
console.log("global", globalFirst.value, globalSecond.value, globalDone.done, globalDone.value);
const infinityIter = infinityLeaves();
const infinityFirst: any = infinityIter.next();
const infinitySecond: any = infinityIter.next(6);
const infinityDone: any = infinityIter.next(7);
console.log("infinity", infinityFirst.value, infinitySecond.value, infinityDone.done, infinityDone.value);
const capturedIter = makeCapturedGenerator(12)();
const capturedFirst: any = capturedIter.next();
const capturedSecond: any = capturedIter.next(4);
const capturedDone: any = capturedIter.next(5);
console.log("captured", capturedFirst.value, capturedSecond.value, capturedDone.done, capturedDone.value);
const capturedLocalIter = makeCapturedLocalGenerator()();
const capturedLocalFirst: any = capturedLocalIter.next();
const capturedLocalSecond: any = capturedLocalIter.next(4);
const capturedLocalDone: any = capturedLocalIter.next(5);
console.log("captured-local", capturedLocalFirst.value, capturedLocalSecond.value, capturedLocalDone.done, capturedLocalDone.value);
const capturedMutable = makeCapturedMutableGenerator();
const capturedMutableIter = capturedMutable[0]();
capturedMutable[1]();
const capturedMutableFirst: any = capturedMutableIter.next();
const capturedMutableSecond: any = capturedMutableIter.next(4);
const capturedMutableDone: any = capturedMutableIter.next(5);
console.log("captured-mutable", capturedMutableFirst.value, capturedMutableSecond.value, capturedMutableDone.done, capturedMutableDone.value);
const capturedDelegatedIter: any = makeCapturedDelegator([60, 61])();
const capturedDelegatedFirst: any = capturedDelegatedIter.next();
const capturedDelegatedSecond: any = capturedDelegatedIter.next(99);
const capturedDelegatedDone: any = capturedDelegatedIter.next(99);
console.log("captured-yield-star", capturedDelegatedFirst.value, capturedDelegatedSecond.value, capturedDelegatedDone.done, capturedDelegatedDone.value);
const thisLeaves = new ThisLeaves();
const thisIter = thisLeaves.values();
const thisFirst: any = thisIter.next();
const thisSecond: any = thisIter.next(6);
const thisDone: any = thisIter.next(7);
console.log("this", thisFirst.value, thisSecond.value, thisDone.done, thisDone.value.marker);
const propertyIter = thisLeaves.propertyValues();
const propertyFirst: any = propertyIter.next();
const propertySecond: any = propertyIter.next(4);
const propertyDone: any = propertyIter.next(5);
console.log("property", propertyFirst.value, propertySecond.value, propertyDone.done, propertyDone.value);
const elementIter = thisLeaves.elementValues();
const elementFirst: any = elementIter.next();
const elementSecond: any = elementIter.next(4);
const elementDone: any = elementIter.next(5);
console.log("element", elementFirst.value, elementSecond.value, elementDone.done, elementDone.value);
const computedElementIter = thisLeaves.computedElementValues();
const computedElementFirst: any = computedElementIter.next();
const computedElementSecond: any = computedElementIter.next(1);
const computedElementThird: any = computedElementIter.next(4);
const computedElementDone: any = computedElementIter.next(5);
console.log("computed-element", computedElementFirst.value, computedElementSecond.value, computedElementThird.value, computedElementDone.done, computedElementDone.value);
