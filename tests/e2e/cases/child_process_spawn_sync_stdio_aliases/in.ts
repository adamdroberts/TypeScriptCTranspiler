import { spawnSync } from "child_process";

const UTF8 = "utf8";
const PIPE = "pipe";
const DEFAULT_STDIN: any = undefined;
const DEFAULT_STDOUT: any = null;
const STDIO_DEFAULTS: any = [DEFAULT_STDIN, DEFAULT_STDOUT, PIPE];

const piped: any = spawnSync("/bin/cat", [], {
    encoding: UTF8,
    input: "alias-stdio",
    stdio: STDIO_DEFAULTS,
});
console.log("tuple alias:", piped.status, piped.stdout, piped.stderr.length);

const INHERITED_STDIN = 0;
const CAPTURE_STDOUT = PIPE;
const CAPTURE_STDERR = PIPE;
const STDIO_FDS: any = [INHERITED_STDIN, CAPTURE_STDOUT, CAPTURE_STDERR];

const fdModes: any = spawnSync("/bin/printf", ["fd-alias"], {
    encoding: UTF8,
    stdio: STDIO_FDS,
});
console.log("fd alias:", fdModes.status, fdModes.stdout, fdModes.stderr.length);
