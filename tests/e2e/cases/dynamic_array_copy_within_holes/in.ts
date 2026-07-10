const sourceHole: any = ["a", "b", "c", "d"];
delete sourceHole[3];
sourceHole.copyWithin(1, 3, 4);
console.log("source hole:", Object.keys(sourceHole).join("|"), Object.hasOwn(sourceHole, "1"), String(sourceHole[1]));

const overlap: any = ["a", "b", "c", "d", "e"];
delete overlap[1];
overlap.copyWithin(1, 0, 4);
console.log("overlap:", Object.keys(overlap).join("|"), Object.hasOwn(overlap, "2"), String(overlap[2]));

const destinationHole: any = ["a", "b", "c", "d"];
delete destinationHole[1];
destinationHole.copyWithin(0, 2, 3);
console.log("destination hole:", Object.keys(destinationHole).join("|"), Object.hasOwn(destinationHole, "0"), destinationHole[0]);
