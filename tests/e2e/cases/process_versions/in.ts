const versions: any = process.versions;

console.log("version:", process.version.length > 0, process.version.charAt(0));
console.log("versions:", typeof versions.node, typeof versions.openssl, typeof versions.tsc2c);
