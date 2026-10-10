export class FieldOwner {
    before: any = [(this as any).value, Object.hasOwn(this, 'value')];
    value: string = 'imported:' + String(7);
    reader: () => any = () => this.value;
    empty!: number;
}

export class BaseOwner {
    base: any = { label: 'base:' + String(7) };
}

export class DerivedOwner extends BaseOwner {
    own: any = this.base;
    constructor() { super(); }
}
