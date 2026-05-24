const source = "1 + 1";
console.log(eval(source));

function localEval(): unknown {
    const localSource = "'local' + '-eval'";
    return eval(localSource);
}

console.log(localEval());

function localCollectionEval(): unknown {
    const key = "second";
    const sources = {
        first: "'unused'",
        second: "'local' + '-collection-eval'",
    } as const;
    return eval(sources[key]);
}

console.log(localCollectionEval());
