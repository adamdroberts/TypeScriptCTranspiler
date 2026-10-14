function subject(): any {
    console.log("hoisted:", typeof value);
    { var value: any; var value: any; }
    { var [value]: [any] = [17]; }
    var value: any;
    const read = (): any => value;
    { var value: any = 23; }
    return read;
}
console.log("retained:", subject()());
