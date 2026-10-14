const stat = fs.statSync("package.json");
stat.size = 17;
stat.mode = 0;
stat.atimeMs = 0;
console.log("ordinary:", stat.size, stat.isFile(), stat.toString());
console.log("retained date:", stat.atime.getTime(), stat.atime === stat.atime);
const dynamic: any = stat;
dynamic.isFile = (): string => "replacement";
console.log("replacement:", stat.isFile());
