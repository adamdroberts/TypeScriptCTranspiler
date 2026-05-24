const source = "1 + 1";
console.log(eval(source));

function localEval(): unknown {
    const localSource = "'local' + '-eval'";
    return eval(localSource);
}

console.log(localEval());
