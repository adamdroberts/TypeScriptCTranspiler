const functions: Array<() => number> = [];
for (const iteration of [3, 5, 7]) {
    {
        const original = declared;
        function declared(): number { return value; }
        let value = iteration;
        functions.push(declared);
        console.log("entry", original === declared, declared());
    }
}
console.log("retained", functions[0](), functions[1](), functions[2](), functions[0] !== functions[1]);
{
    function recursive(depth: number): string { return depth ? recursive(depth - 1) : "original"; }
    const original = recursive;
    console.log("recursive", original(1));
}
async function collectAsync(): Promise<any[]> {
    const retained: any[] = [];
    for (const iteration of [11, 13]) {
        {
            const original = declared;
            function declared(): number { return value; }
            await Promise.resolve();
            let value = iteration;
            retained.push(declared);
            console.log("async-entry", original === declared, declared());
        }
    }
    return retained;
}
collectAsync().then((retained: any[]) => {
    console.log("async-retained", retained[0](), retained[1](), retained[0] !== retained[1]);
});
