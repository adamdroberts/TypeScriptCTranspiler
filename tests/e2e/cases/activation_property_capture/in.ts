function forward(...tail:any[]):any{return Function(...tail)}
console.log("activation:",forward("return 71;")());
async function* unrelated(){yield 1;return 2}
unrelated().next();
