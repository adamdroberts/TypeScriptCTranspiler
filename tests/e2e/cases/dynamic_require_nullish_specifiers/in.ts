const choose = Date.now() < 0;

const maybeName: any = choose ? "./nullish_left" : undefined;
const nullishName = maybeName ?? "./nullish_fallback";
const nullishPkg: any = require(nullishName);
console.log("nullish fallback:", nullishPkg.name);

const directName = undefined ?? "./nullish_direct";
const directPkg: any = require(directName);
console.log("nullish direct:", directPkg.name);

const keptSource: any = "./nullish_kept";
const keptName = keptSource ?? "./nullish_unused";
const keptPkg: any = require(keptName);
console.log("nullish kept:", keptPkg.name);
