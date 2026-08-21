async function unsupportedCapturedDeclaration(): Promise<number> {
    const offset = 2;
    await Promise.resolve(1);
    function nested(): number {
        return offset;
    }
    return nested();
}

unsupportedCapturedDeclaration().then((value) => console.log(value));
