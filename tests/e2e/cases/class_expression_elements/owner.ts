export const methodKey: unique symbol = Symbol('imported-method');
export const accessorKey: unique symbol = Symbol('imported-accessor');
export function makeOwner(label: any): any {
    return class ImportedOwner {
        [methodKey](input: any = label): any { return input; }
        get [accessorKey](): any { return (this as any).value; }
        set [accessorKey](input: any) { (this as any).value = input; }
        static [methodKey](): any { return this; }
    };
}
