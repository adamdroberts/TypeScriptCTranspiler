const events: string[] = [];

class Config {
    static prefix: string = "A";
    static value: string;

    static {
        events.push("block1:" + Config.prefix);
        Config.value = Config.prefix + "1";
    }

    static combined: string = Config.value + "B";

    static {
        events.push("block2:" + Config.combined);
        Config.value = Config.combined + "2";
    }

    static describe(): string {
        return Config.prefix + ":" + Config.value + ":" + Config.combined;
    }
}

events.push("after class:" + Config.value);

class Later {
    static first: string = Config.value;

    static {
        events.push("later:" + Later.first);
        Later.first = Later.first + "!";
    }
}

console.log("config:", Config.describe());
console.log("later:", Later.first);
console.log("events:", events.join("|"));
