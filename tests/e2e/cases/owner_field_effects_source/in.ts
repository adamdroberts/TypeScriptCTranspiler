function mutate(owner: any): void { owner.value = "changed"; owner.added = "new"; }
const owner: any = { value: "before" };
const saved = owner.value;
mutate(owner);
console.log("effects:", saved, owner.value, owner.added);
const accessor: any = { get value(): string { return "getter"; } };
console.log("accessor:", accessor.value);
