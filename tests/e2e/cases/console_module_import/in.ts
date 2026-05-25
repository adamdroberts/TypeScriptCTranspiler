import consoleDefault, { info, log } from "node:console";
import * as consoleNs from "console";

log("named %s", "log");
info("named info", 1);
consoleNs.log("namespace %d", 2);
consoleDefault.info("default", ["ok"]);
