let selected = "tsc2c-cjs-named-package";
const pkg: any = require(selected);

console.log("mapped package:", pkg.label, pkg.add(6, 7));
