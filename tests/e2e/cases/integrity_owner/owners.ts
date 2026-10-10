export function sparseOwner(value: any): any[] {
    const owner: any[] = new Array(4294967295);
    owner[4000] = value;
    return owner;
}
export function callableOwner(value: any): any {
    function owner(actual: any): any { return actual; }
    (owner as any).value = value;
    return owner;
}
