async function unsupportedNestedDeclaration(): Promise<number> {
    await Promise.resolve(1);
    function nested(): number {
        return 2;
    }
    return nested();
}

unsupportedNestedDeclaration().then(console.log);
