import * as nodeOs from "node:os";
import { devNull } from "os";
import { devNull as nodeDevNull } from "node:os";

console.log("global:", os.devNull);
console.log("namespace:", nodeOs.devNull);
console.log("named:", devNull, nodeDevNull);
