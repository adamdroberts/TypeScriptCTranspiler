import ordinary from 'util';
import * as namespace from 'node:util';
import {TextEncoder as Encoder,TextDecoder as Decoder} from 'util';

const bytes=new Encoder().encode('Hi');
console.log('identity',ordinary.TextEncoder===Encoder,namespace.TextDecoder===Decoder);
console.log('codec',bytes.length,bytes[1],new Decoder().decode(bytes));
