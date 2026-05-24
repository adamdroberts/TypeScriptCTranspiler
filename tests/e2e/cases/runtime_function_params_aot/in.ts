const makeNumber = Function("ignored", "return 42;");
console.log("function params aot:", makeNumber());

const makeString = new Function("left", "right", "return 'joined';");
console.log("new function params aot:", makeString());

function localParamFunction(): unknown {
    const name = "ignored";
    const body = "return 'local-function';";
    const makeLocal = Function(name, body);
    return makeLocal();
}

function localNewParamFunction(): unknown {
    const left = "left";
    const right = "right";
    const body = "return 'local-new-function';";
    const makeLocal = new Function(left, right, body);
    return makeLocal();
}

console.log("local function params aot:", localParamFunction());
console.log("local new function params aot:", localNewParamFunction());
