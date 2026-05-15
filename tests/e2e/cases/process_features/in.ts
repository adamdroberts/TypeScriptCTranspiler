const features: any = process.features;

console.log("types:", typeof features.inspector, typeof features.debug, typeof features.uv, typeof features.tls);
console.log("values:", features.inspector, features.debug, features.uv, features.ipv6, features.tls);
console.log("tls:", features.tls_alpn, features.tls_sni, features.tls_ocsp, features.cached_builtins);
