async function makeOwner(): Promise<any> {
    class Local { [await Promise.resolve('read')](): any { return 1; } }
    return Local;
}
makeOwner();
