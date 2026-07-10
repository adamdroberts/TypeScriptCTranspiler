const removedTailHole: any = ["a", "b", "c", "d"];
delete removedTailHole[3];
const removed: any = removedTailHole.splice(1, 1);
console.log("tail:", Object.keys(removedTailHole).join("|"), Object.hasOwn(removedTailHole, "2"), String(removedTailHole[2]), Object.keys(removed).join("|"));

const shiftedHole: any = ["a", "b", "c"];
delete shiftedHole[1];
shiftedHole.splice(0, 0, "x");
console.log("insert:", Object.keys(shiftedHole).join("|"), Object.hasOwn(shiftedHole, "2"), String(shiftedHole[2]));
