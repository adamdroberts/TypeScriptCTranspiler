export class InstanceOwner {
    value: any = 7;
    activation(value: number = 5, ...rest: number[]): any {
        return () => [this, arguments, value, rest];
    }
    echo(value: number): number { return value; }
    numeric(value: number): number { return Math.sqrt(value); }
    get current(): any { return this.value; }
    set current(value: number) { this.value = value; }
    *values(value: number): any { yield [this, value]; }
    async delayed(value: number): Promise<any> {
        const receiver = this;
        await Promise.resolve();
        return [receiver, value];
    }
}
export class DerivedOwner extends InstanceOwner { tag = 9; }
