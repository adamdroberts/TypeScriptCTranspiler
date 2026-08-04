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
breakRun();
continueRun();
console.log("loop exits:", events);
