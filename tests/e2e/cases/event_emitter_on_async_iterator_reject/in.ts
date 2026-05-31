import { EventEmitter, on } from "events";

const emitter = new EventEmitter();
on(emitter, "data");
