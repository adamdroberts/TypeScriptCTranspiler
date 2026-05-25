let selected = "tsc2c-cjs-named-package";
const pkg: any = require(selected);

console.log("manifest package:", pkg.label, pkg.add(4, 5));
