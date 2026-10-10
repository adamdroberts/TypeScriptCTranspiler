let observations = "";
function observe(value: any, context: ClassGetterDecoratorContext): void {
    observations += String(context.kind) + ":" + String(context.name);
}
export class Owner {
    value = 9;
    @observe
    get read(): number { return this.value; }
}
export function trace(): string { return observations; }
