const addon = require("native-pkg");
console.log(addon.myFunction);

function test(callback: any) {
    const fn = require("native-pkg").myFunction;
    fn(callback);
}

test((value: any) => {
    console.log(value);
});
