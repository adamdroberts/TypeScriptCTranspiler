const owner: any = {};
owner.method = function (): number { return 17; };
try {
    console.log("assigned:" + owner.method());
} catch (error) {
    eval(String(error));
}
const descriptorOwner: any = {};
Object.defineProperty(descriptorOwner, "method", { value: function (): number { return 19; } });
try {
    console.log("defined:" + descriptorOwner.method());
} catch (error) {
    eval(String(error));
}
