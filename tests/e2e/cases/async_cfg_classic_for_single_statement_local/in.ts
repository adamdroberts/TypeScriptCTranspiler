async function buildSequence(limit: number): Promise<string> {
    const values: number[] = [];
    for (let index = 0; index < limit; index++) values.push(index % 3);
    await Promise.resolve();
    let output = "";
    for (let index = 0; index < values.length; index++) output += values[index];
    return output;
}

buildSequence(8).then((result) => console.log(result));
