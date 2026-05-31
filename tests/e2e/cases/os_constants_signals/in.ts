import * as os from "os";
import { constants as osConstants } from "os";
import * as nodeOs from "node:os";
import { constants as nodeOsConstants } from "node:os";

console.log("os.constants.signals.SIGHUP:", os.constants.signals.SIGHUP);
console.log("os.constants.signals.SIGINT:", os.constants.signals.SIGINT);
console.log("os.constants.signals.SIGTERM:", os.constants.signals.SIGTERM);
console.log("os.constants.signals.SIGKILL:", os.constants.signals.SIGKILL);
console.log("os.constants.signals.SIGUSR1:", os.constants.signals.SIGUSR1);
console.log("os.constants.signals.SIGUSR2:", os.constants.signals.SIGUSR2);
console.log("nodeOs.constants.signals.SIGHUP:", nodeOs.constants.signals.SIGHUP);
console.log("osConstants.signals.SIGINT:", osConstants.signals.SIGINT);
console.log("nodeOsConstants.signals.SIGTERM:", nodeOsConstants.signals.SIGTERM);
