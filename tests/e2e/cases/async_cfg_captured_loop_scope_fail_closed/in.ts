async function requiresLoopScopeEntries(): Promise<number> {
    const readers: any = [];
    for (const outer of [1, 2]) {
        let local = outer;
        readers.push((): any => local);
        await Promise.resolve();
    }
    return readers[0]() + readers[1]();
}

requiresLoopScopeEntries().then(console.log);
