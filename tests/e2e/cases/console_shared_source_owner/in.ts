import {URL as ImportedURL} from "node:url";
import * as consoleModule from "node:console";
import {owner, log, emit, resumed} from "./owner";
async function main(): Promise<void> {
 console.log("identity:", owner === console, log === consoleModule.log);
 console.log("awaited:", ImportedURL.canParse(await Promise.resolve("https://example.com/")));
 const borrowed = console.log; borrowed("borrowed:", true);
 emit("spread:", ...[1, 2, 3]);
 await resumed("source import");
 console.info("format %s %d %i %f %%", "ok", 3, "4.5tail", "4.5tail");
 console.log("single %% %s");
}
main();
