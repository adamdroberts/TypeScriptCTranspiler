import consoleDefault, { info, info as infoAlias, log, log as logAlias } from "node:console";
import * as consoleNs from "console";

log("named %s", "log");
info("named info", 1);
logAlias("alias %s", "log");
infoAlias("alias info", 3);
consoleNs.log("namespace %d", 2);
consoleDefault.info("default", ["ok"]);
