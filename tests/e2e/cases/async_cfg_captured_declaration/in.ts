async function capturedDeclaration(): Promise<number> {
    const offset = 2;
    await Promise.resolve(1);
    function nested(): number {
        return offset;
    }
    return nested();
}

capturedDeclaration().then((value) => console.log(value));
