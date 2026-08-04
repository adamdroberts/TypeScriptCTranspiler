let events = "";

function run(): void {
    const firstValue: any = {};
    firstValue[Symbol.dispose] = (): void => {
        events += "1";
    };
    const secondValue: any = {};
    secondValue[Symbol.dispose] = (): void => {
        events += "2";
    };
    using first: any = firstValue;
    using second: any = secondValue;
    events += "body";
}

function returnRun(): string {
    const value: any = {};
    value[Symbol.dispose] = (): void => {
        events += "r";
    };
    using resource: any = value;
    return (events += "e", "returned");
}

function throwRun(): void {
    const value: any = {};
    value[Symbol.dispose] = (): void => {
        events += "t";
    };
    using resource: any = value;
    throw (events += "x", "thrown");
}

function nestedReturnRun(shouldReturn: boolean): string {
    const value: any = {};
    value[Symbol.dispose] = (): void => {
        events += "n";
    };
    using resource: any = value;
    if (shouldReturn) return (events += "N", "nested");
    events += "f";
    return "fallthrough";
}

function nestedThrowRun(shouldThrow: boolean): void {
    const value: any = {};
    value[Symbol.dispose] = (): void => {
        events += "q";
    };
    using resource: any = value;
    if (shouldThrow) throw (events += "X", "nested-throw");
    events += "g";
}

function breakRun(): void {
    for (let i = 0; i < 1; i++) {
        const value: any = {};
        value[Symbol.dispose] = (): void => {
            events += "B";
        };
        using resource: any = value;
        events += "b";
        break;
    }
}

function continueRun(): void {
    for (let i = 0; i < 2; i++) {
        const value: any = {};
        value[Symbol.dispose] = (): void => {
            events += "C";
        };
        using resource: any = value;
        events += "c";
        continue;
    }
}

run();
console.log(events);
console.log("return:", returnRun(), events);
let caught = "";
try {
    throwRun();
} catch (error) {
    caught = String(error);
}
console.log("throw:", caught, events);
console.log("nested return:", nestedReturnRun(true), events);
let nestedCaught = "";
try {
    nestedThrowRun(true);
} catch (error) {
    nestedCaught = String(error);
}
console.log("nested throw:", nestedCaught, events);
breakRun();
continueRun();
console.log("loop exits:", events);

async function asyncReturnRun(): Promise<string> {
    const value: any = {};
    value[Symbol.dispose] = (): void => {
        events += "A";
    };
    using resource: any = value;
    return (events += "a", "async");
}

asyncReturnRun().then((value) => console.log("async return:", value, events));
