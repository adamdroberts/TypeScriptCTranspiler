// @ts-nocheck
import util from 'util';
const target=util;target.format=()=> './other';
console.log('mutable formatter:',require(target.format('./first')).label);
