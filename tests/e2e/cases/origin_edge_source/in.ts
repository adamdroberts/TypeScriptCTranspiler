function mutate(owner: any): void { owner.source = "19;"; }
function make(source: string): any { return {source}; }
const owner: any = make("17;");
owner.self = owner;
const saved: string = owner.self.source;
mutate(owner);
console.log("captured:", eval(saved));
console.log("current:", owner.source);
function returned(value: any): any { return {read(): string { return value.source; }}; }
const reader: any = returned(owner);
console.log("returned:", reader.read());
