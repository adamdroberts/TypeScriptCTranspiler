let body = "return 17;";
const makeNumber = Function("ignored", body);
console.log("manifest function params:", makeNumber());

body = "return 'manifest-params';";
const makeString = new Function("left", "right", body);
console.log("manifest new function params:", makeString());

function localManifestFunction(nextBody: string): unknown {
    const ignoredName = "ignored";
    const makeLocal = Function(ignoredName, nextBody);
    return makeLocal();
}

function localManifestNewFunction(nextBody: string): unknown {
    const leftName = "left";
    const rightName = "right";
    const makeLocal = new Function(leftName, rightName, nextBody);
    return makeLocal();
}

body = "return 23;";
console.log("local manifest function params:", localManifestFunction(body));

body = "return 'local-manifest-params';";
console.log("local manifest new function params:", localManifestNewFunction(body));
