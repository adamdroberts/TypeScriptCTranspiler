class Worker {
    prefix: string;

    constructor(prefix: string) {
        this.prefix = prefix;
    }

    async label(id: number): Promise<string> {
        return this.prefix + id;
    }

    async noop(): Promise<void> {
        console.log("inside noop");
    }

    static async count(next: number): Promise<number> {
        return next + 1;
    }
}

const worker = new Worker("job-");

worker.label(7).then((value: string): void => {
    console.log("label:", value);
});

worker.noop().then((_value: any): void => {
    console.log("noop");
});

Worker.count(4).then((value: number): void => {
    console.log("count:", value);
});
