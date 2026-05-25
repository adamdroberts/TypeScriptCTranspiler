const IPV4_FAMILY = 4;
const USE_ALL = false;
const USE_VERBATIM = true;
const LOOKUP_ORDER = "ipv4first";
const OBJECT_OPTIONS = { family: 4, verbatim: true, order: "ipv4first" } as const;
const CONST_OBJECT_OPTIONS = { family: IPV4_FAMILY, all: USE_ALL, verbatim: USE_VERBATIM, order: LOOKUP_ORDER } as const;

dns.lookup("127.0.0.1", 4, (err: any, address: string, family: number): void => {
    console.log("numeric callback:", err === null, address, family);
});

dns.lookup("127.0.0.1", OBJECT_OPTIONS, (err: any, address: string, family: number): void => {
    console.log("object extras:", err === null, address, family);
});

dns.lookup("127.0.0.1", IPV4_FAMILY, (err: any, address: string, family: number): void => {
    console.log("numeric const callback:", err === null, address, family);
});

dns.lookup("127.0.0.1", CONST_OBJECT_OPTIONS, (err: any, address: string, family: number): void => {
    console.log("object const extras:", err === null, address, family);
});

dns.promises.lookup("127.0.0.1", 4).then((result: any): void => {
    console.log("numeric promise:", result.address, result.family);
});

dns.promises.lookup("127.0.0.1", IPV4_FAMILY).then((result: any): void => {
    console.log("numeric const promise:", result.address, result.family);
});
