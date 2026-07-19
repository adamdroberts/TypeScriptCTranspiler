import { setTimeout as delay } from "node:timers/promises";

function delayedReject(ms: number, reason: string): Promise<string> {
    return delay(ms, reason).then((value: string): string => {
        throw value;
    });
}

let trace = "";

async function declaration(flag: boolean): Promise<string> {
    if (flag) {
        try {
            return await delay(1, "declaration-ok");
        } finally {
            trace = trace + "D";
        }
    }
    try {
        return await delayedReject(2, "declaration-bad");
    } finally {
        trace = trace + "d";
    }
}

class Worker {
    async run(flag: boolean): Promise<string> {
        if (flag) {
            try {
                return await delay(3, "method-ok");
            } finally {
                trace = trace + "M";
            }
        }
        try {
            return await delayedReject(4, "method-bad");
        } finally {
            trace = trace + "m";
        }
    }
}

const value = async (flag: boolean): Promise<string> => {
    if (flag) {
        try {
            return await delay(5, "value-ok");
        } finally {
            trace = trace + "V";
        }
    }
    try {
        return await delayedReject(6, "value-bad");
    } finally {
        trace = trace + "v";
    }
};

declaration(true).then((result) => console.log("declaration-ok:", result, trace));
declaration(false).catch((reason) => console.log("declaration-catch:", reason, trace));
new Worker().run(true).then((result) => console.log("method-ok:", result, trace));
new Worker().run(false).catch((reason) => console.log("method-catch:", reason, trace));
value(true).then((result) => console.log("value-ok:", result, trace));
value(false).catch((reason) => console.log("value-catch:", reason, trace));
