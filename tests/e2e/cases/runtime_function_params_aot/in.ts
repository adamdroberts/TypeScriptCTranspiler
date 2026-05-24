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

function localCollectionParamFunction(): unknown {
    const key = "second";
    const names = {
        first: "unused",
        second: "ignored",
    } as const;
    const bodies = {
        first: "return 'unused';",
        second: "return 'local-collection-function';",
    } as const;
    const makeLocal = Function(names[key], bodies[key]);
    return makeLocal();
}

function localArrayIndexParamFunction(): unknown {
    const names = ["unused", "ignored"] as const;
    const bodies = ["return 'unused';", "return 'local-array-index-function';"] as const;
    const makeLocal = Function(names[1], bodies[1]);
    return makeLocal();
}

console.log("local function params aot:", localParamFunction());
console.log("local new function params aot:", localNewParamFunction());
console.log("local collection function params aot:", localCollectionParamFunction());
console.log("local array index function params aot:", localArrayIndexParamFunction());
