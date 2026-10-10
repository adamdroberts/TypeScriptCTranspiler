export function makeOwner(marker: any): any {
    return {
        marker,
        read(): any { return super.read(); },
        arrow(): any { return () => super.read(); },
        async query(key: any): Promise<any> {
            await Promise.resolve(0);
            return [super[key], this, () => super[key]];
        },
        write(key: any, value: any): any { return super[key] = value; },
    };
}
export function makeBase(): any {
    return {read(): any { return this.marker; }, get field(): any { return this.marker; }, set field(value: any) { this.marker = value; }};
}
