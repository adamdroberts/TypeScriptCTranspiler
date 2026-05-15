dns.lookup("127.0.0.1", 4, (err: any, address: string, family: number): void => {
    console.log("numeric callback:", err === null, address, family);
});

dns.lookup("127.0.0.1", { family: 4, verbatim: true, order: "ipv4first" }, (err: any, address: string, family: number): void => {
    console.log("object extras:", err === null, address, family);
});

dns.promises.lookup("127.0.0.1", 4).then((result: any): void => {
    console.log("numeric promise:", result.address, result.family);
});
