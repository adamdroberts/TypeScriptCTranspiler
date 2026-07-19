const direct = new URL("https://ada:lovelace@example.com:8443/dir/page?q=1#frag");

const fromUsername = require("./urlcred_" + direct.username);
const fromPassword = require("./urlcred_" + direct.password);

const empty = new URL("https://example.com/path");
const fromEmptyUsername = require("./urlcred_user_" + empty.username);
const fromEmptyPassword = require("./urlcred_pass_" + empty.password);

const relative = new URL("next", "https://grace:hopper@example.com/base/page.html");
const fromBaseUsername = require("./urlcred_base_user_" + relative.username);
const fromBasePassword = require("./urlcred_base_pass_" + relative.password);

console.log(
    fromUsername.label,
    fromPassword.label,
    fromEmptyUsername.label,
    fromEmptyPassword.label,
    fromBaseUsername.label,
    fromBasePassword.label,
);
