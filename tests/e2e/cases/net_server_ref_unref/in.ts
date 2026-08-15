import { createServer } from "net";

const server = createServer(() => {});
server.listen(0, "127.0.0.1", () => {
    console.log("server-listening");
    server.unref();
    server.ref();
    setTimeout(() => {
        console.log("server-refed");
        server.close(() => {
            console.log("server-closed");
            const unrefed = createServer(() => {});
            unrefed.listen(0, "127.0.0.1", () => {
                console.log("server-unref-listening");
                unrefed.unref();
                setTimeout(() => console.log("server-unref-window"), 10);
            });
        });
    }, 10);
});
