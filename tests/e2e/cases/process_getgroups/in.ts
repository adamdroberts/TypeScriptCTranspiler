const groups = process.getgroups();

console.log("groups:", groups.length >= 1, groups.includes(process.getegid()));
