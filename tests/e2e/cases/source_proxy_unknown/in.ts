// @ts-nocheck
let body="17;";const inherited=new Proxy({value:1},{get(){body=String(Math.random());return 1;}});Object.defineProperty({},"x",Object.create(inherited));eval(body);
