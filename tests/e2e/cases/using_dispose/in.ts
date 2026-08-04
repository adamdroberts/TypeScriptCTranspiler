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

run();
console.log(events);
