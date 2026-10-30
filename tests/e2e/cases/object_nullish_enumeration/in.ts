function report(label: string, fn: () => any): void {
    try {
        console.log(label + ":", fn());
    } catch (e: any) {
        // Error message text is implementation-defined; assert the error kind.
        console.log(label + ":", e instanceof TypeError ? "TypeError" : e);
    }
}

const nullTarget: any = null;
const undefinedTarget: any = undefined;
const numberTarget: any = 7;

report("keys null", (): any => Object.keys(nullTarget).length);
report("values undefined", (): any => Object.values(undefinedTarget).length);
report("entries null", (): any => Object.entries(nullTarget).length);
console.log("number keys:", Object.keys(numberTarget).length);
