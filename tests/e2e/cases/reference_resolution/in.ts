async function verify(): Promise<void> {
const result: any = eval(`
function retained(){
    let captured=11;
    const inner=(function(){captured=(eval("var captured=13;"),17);return captured;})();
    return [inner,captured];
}
retained();
`);
console.log(result.join(":"));
const resumed: any = await eval(`
globalThis.referenceSuspended=11;
(async function(){
    referenceSuspended=await eval("var referenceSuspended=13;17;");
    return [referenceSuspended,globalThis.referenceSuspended];
})();
`);
console.log(resumed.join(":"));
}
verify();
