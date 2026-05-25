function report(label: string, fn: () => any): void {
    try {
        console.log(label + ":", fn());
    } catch (e: any) {
        console.log(label + ":", e);
    }
}

const sealed: any = [5, 6];
Object.seal(sealed);
report("sealed assign", (): any => Object.assign(sealed, [7, 8, 9]) === sealed);
console.log("sealed:", sealed.length, sealed.join("|"));

const frozen: any = [1, 2];
Object.freeze(frozen);
report("frozen assign", (): any => Object.assign(frozen, [3, 4]) === frozen);
console.log("frozen:", frozen.join("|"));
