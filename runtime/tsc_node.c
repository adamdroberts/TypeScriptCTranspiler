#include "tsc_internal.h"
#include <sys/statvfs.h>

/* ---------------- crypto ---------------- */

struct tsc_hash {
    const EVP_MD* md;
    EVP_MD_CTX* ctx;
    bool finalized;
    size_t digest_len;
    unsigned char digest[EVP_MAX_MD_SIZE];
};

tsc_hash_t* tsc_crypto_create_hash(const tsc_str_t* algorithm) {
    const EVP_MD* md = NULL;
    if (str_lit_eq(algorithm, "sha1")) {
        md = EVP_sha1();
    } else if (str_lit_eq(algorithm, "sha224")) {
        md = EVP_sha224();
    } else if (str_lit_eq(algorithm, "sha256")) {
        md = EVP_sha256();
    } else if (str_lit_eq(algorithm, "sha384")) {
        md = EVP_sha384();
    } else if (str_lit_eq(algorithm, "sha512")) {
        md = EVP_sha512();
    } else if (str_lit_eq(algorithm, "md5")) {
        md = EVP_md5();
    } else {
        tsc_throw_str(tsc_str_from_cstr("crypto.createHash: only md5, sha1, sha224, sha256, sha384, and sha512 are supported"));
    }

    tsc_hash_t* h = (tsc_hash_t*)TSC_GC_MALLOC(sizeof(tsc_hash_t));
    h->md = md;
    h->ctx = EVP_MD_CTX_new();
    h->finalized = false;
    memset(h->digest, 0, sizeof h->digest);
    int digest_size = EVP_MD_size(md);
    if (!h->ctx || digest_size <= 0 || (size_t)digest_size > sizeof h->digest) {
        tsc_panic("crypto.createHash: could not initialize digest");
    }
    h->digest_len = (size_t)digest_size;
    if (EVP_DigestInit_ex(h->ctx, h->md, NULL) != 1) {
        EVP_MD_CTX_free(h->ctx);
        h->ctx = NULL;
        tsc_panic("crypto.createHash: could not initialize digest");
    }
    return h;
}

/* ---------------- hmac ---------------- */

struct tsc_hmac {
    const EVP_MD* md;
    HMAC_CTX* ctx;
    bool finalized;
    size_t digest_len;
    unsigned char digest[EVP_MAX_MD_SIZE];
};

tsc_hmac_t* tsc_crypto_create_hmac_str(const tsc_str_t* algorithm, const tsc_str_t* key) {
    const EVP_MD* md = NULL;
    if (str_lit_eq(algorithm, "sha1")) {
        md = EVP_sha1();
    } else if (str_lit_eq(algorithm, "sha224")) {
        md = EVP_sha224();
    } else if (str_lit_eq(algorithm, "sha256")) {
        md = EVP_sha256();
    } else if (str_lit_eq(algorithm, "sha384")) {
        md = EVP_sha384();
    } else if (str_lit_eq(algorithm, "sha512")) {
        md = EVP_sha512();
    } else if (str_lit_eq(algorithm, "md5")) {
        md = EVP_md5();
    } else {
        tsc_throw_str(tsc_str_from_cstr("crypto.createHmac: only md5, sha1, sha224, sha256, sha384, and sha512 are supported"));
    }

    tsc_hmac_t* h = (tsc_hmac_t*)TSC_GC_MALLOC(sizeof(tsc_hmac_t));
    h->md = md;
    h->ctx = HMAC_CTX_new();
    h->finalized = false;
    memset(h->digest, 0, sizeof h->digest);
    int digest_size = EVP_MD_size(md);
    if (!h->ctx || digest_size <= 0 || (size_t)digest_size > sizeof h->digest) {
        tsc_panic("crypto.createHmac: could not initialize context");
    }
    h->digest_len = (size_t)digest_size;

    const void* key_data = key ? key->data : NULL;
    int key_len = key ? (int)key->len : 0;
    if (HMAC_Init_ex(h->ctx, key_data, key_len, h->md, NULL) != 1) {
        HMAC_CTX_free(h->ctx);
        h->ctx = NULL;
        tsc_panic("crypto.createHmac: could not initialize hmac");
    }
    return h;
}

tsc_hmac_t* tsc_crypto_create_hmac_buffer(const tsc_str_t* algorithm, const tsc_buffer_t* key) {
    const EVP_MD* md = NULL;
    if (str_lit_eq(algorithm, "sha1")) {
        md = EVP_sha1();
    } else if (str_lit_eq(algorithm, "sha224")) {
        md = EVP_sha224();
    } else if (str_lit_eq(algorithm, "sha256")) {
        md = EVP_sha256();
    } else if (str_lit_eq(algorithm, "sha384")) {
        md = EVP_sha384();
    } else if (str_lit_eq(algorithm, "sha512")) {
        md = EVP_sha512();
    } else if (str_lit_eq(algorithm, "md5")) {
        md = EVP_md5();
    } else {
        tsc_throw_str(tsc_str_from_cstr("crypto.createHmac: only md5, sha1, sha224, sha256, sha384, and sha512 are supported"));
    }

    tsc_hmac_t* h = (tsc_hmac_t*)TSC_GC_MALLOC(sizeof(tsc_hmac_t));
    h->md = md;
    h->ctx = HMAC_CTX_new();
    h->finalized = false;
    memset(h->digest, 0, sizeof h->digest);
    int digest_size = EVP_MD_size(md);
    if (!h->ctx || digest_size <= 0 || (size_t)digest_size > sizeof h->digest) {
        tsc_panic("crypto.createHmac: could not initialize context");
    }
    h->digest_len = (size_t)digest_size;

    const void* key_data = key ? key->data : NULL;
    int key_len = key ? (int)key->len : 0;
    if (HMAC_Init_ex(h->ctx, key_data, key_len, h->md, NULL) != 1) {
        HMAC_CTX_free(h->ctx);
        h->ctx = NULL;
        tsc_panic("crypto.createHmac: could not initialize hmac");
    }
    return h;
}

void hmac_update_bytes(tsc_hmac_t* h, const void* data, size_t len) {
    if (h->finalized) return;
    if (len == 0) return;
    if (!h->ctx || HMAC_Update(h->ctx, (const unsigned char*)data, len) != 1) {
        tsc_panic("Hmac.update: could not update hmac");
    }
}

tsc_hmac_t* tsc_hmac_update(tsc_hmac_t* h, const tsc_str_t* data) {
    hmac_update_bytes(h, data->data, data->len);
    return h;
}

tsc_hmac_t* tsc_hmac_update_buffer(tsc_hmac_t* h, const tsc_buffer_t* data) {
    if (data) hmac_update_bytes(h, data->data, data->len);
    return h;
}

void hmac_finalize(tsc_hmac_t* h) {
    if (!h->finalized) {
        unsigned int digest_len = 0;
        if (!h->ctx || HMAC_Final(h->ctx, h->digest, &digest_len) != 1) {
            tsc_panic("Hmac.digest: could not finalize hmac");
        }
        h->digest_len = (size_t)digest_len;
        HMAC_CTX_free(h->ctx);
        h->ctx = NULL;
        h->finalized = true;
    }
}

tsc_str_t* tsc_hmac_digest(tsc_hmac_t* h, const tsc_str_t* encoding) {
    bool use_hex = str_lit_eq(encoding, "hex");
    bool use_base64 = str_lit_eq(encoding, "base64");
    if (!use_hex && !use_base64) {
        tsc_throw_str(tsc_str_from_cstr("Hmac.digest: only hex and base64 encodings are supported"));
    }
    hmac_finalize(h);
    if (use_base64) {
        return str_from_base64_bytes(h->digest, h->digest_len);
    }
    static const char hex[] = "0123456789abcdef";
    tsc_str_t* out = str_alloc(h->digest_len * 2);
    char* p = (char*)out->data;
    for (size_t i = 0; i < h->digest_len; i++) {
        p[i * 2] = hex[h->digest[i] >> 4];
        p[i * 2 + 1] = hex[h->digest[i] & 0x0f];
    }
    return out;
}

tsc_buffer_t* tsc_hmac_digest_buffer(tsc_hmac_t* h, const tsc_str_t* encoding) {
    if (!str_lit_eq(encoding, "buffer")) {
        tsc_throw_str(tsc_str_from_cstr("Hmac.digest: encoding must be 'buffer' when returning a Buffer"));
    }
    hmac_finalize(h);
    tsc_buffer_t* out = tsc_buffer_alloc((double)h->digest_len, 0.0);
    memcpy(out->data, h->digest, h->digest_len);
    return out;
}

tsc_buffer_t* tsc_crypto_random_bytes(double size) {
    if (isnan(size) || isinf(size) || size < 0) {
        tsc_throw_str(tsc_str_from_cstr("crypto.randomBytes size must be a non-negative finite number"));
    }
    tsc_buffer_t* out = tsc_buffer_alloc(size, 0);
    if (out->len == 0) return out;
    if (RAND_bytes(out->data, (int)out->len) != 1) {
        for (size_t i = 0; i < out->len; i++) {
            out->data[i] = (uint8_t)(rand() & 0xff);
        }
    }
    return out;
}

tsc_str_t* tsc_crypto_random_uuid(void) {
    tsc_buffer_t* bytes = tsc_crypto_random_bytes(16.0);
    bytes->data[6] = (uint8_t)((bytes->data[6] & 0x0fu) | 0x40u);
    bytes->data[8] = (uint8_t)((bytes->data[8] & 0x3fu) | 0x80u);
    static const char hex[] = "0123456789abcdef";
    tsc_str_t* out = str_alloc(36);
    char* p = (char*)out->data;
    size_t pos = 0;
    for (size_t i = 0; i < 16; i++) {
        if (i == 4 || i == 6 || i == 8 || i == 10) p[pos++] = '-';
        p[pos++] = hex[bytes->data[i] >> 4];
        p[pos++] = hex[bytes->data[i] & 0x0f];
    }
    return out;
}

tsc_buffer_t* tsc_crypto_random_fill_sync(tsc_buffer_t* buffer, double offset, double size, bool offset_is_null, bool size_is_null) {
    if (!buffer) {
        tsc_throw_str(tsc_str_from_cstr("crypto.randomFillSync: buffer is null"));
        return NULL;
    }
    size_t off = 0;
    if (!offset_is_null) {
        if (isnan(offset) || isinf(offset) || offset < 0) {
            tsc_throw_str(tsc_str_from_cstr("crypto.randomFillSync: offset must be a non-negative finite number"));
            return NULL;
        }
        off = (size_t)offset;
        if (off > buffer->len) {
            tsc_throw_str(tsc_str_from_cstr("crypto.randomFillSync: offset is out of bounds"));
            return NULL;
        }
    }
    size_t len = buffer->len - off;
    if (!size_is_null) {
        if (isnan(size) || isinf(size) || size < 0) {
            tsc_throw_str(tsc_str_from_cstr("crypto.randomFillSync: size must be a non-negative finite number"));
            return NULL;
        }
        len = (size_t)size;
        if (off + len > buffer->len) {
            tsc_throw_str(tsc_str_from_cstr("crypto.randomFillSync: offset + size is out of bounds"));
            return NULL;
        }
    }
    if (len == 0) {
        return buffer;
    }
    uint8_t* ptr = buffer->data + off;
    if (RAND_bytes(ptr, (int)len) != 1) {
        for (size_t i = 0; i < len; i++) {
            ptr[i] = (uint8_t)(rand() & 0xff);
        }
    }
    return buffer;
}


bool tsc_crypto_timing_safe_equal(const tsc_buffer_t* a, const tsc_buffer_t* b) {
    if (!a || !b || a->len != b->len) {
        tsc_throw_str(tsc_str_from_cstr("crypto.timingSafeEqual: inputs must have the same byte length"));
    }
    uint8_t diff = 0;
    for (size_t i = 0; i < a->len; i++) {
        diff |= (uint8_t)(a->data[i] ^ b->data[i]);
    }
    return diff == 0;
}

tsc_buffer_t* tsc_crypto_pbkdf2_sync_impl(const void* password_data, size_t password_len, const void* salt_data, size_t salt_len, double iterations, double keylen, const tsc_str_t* digest) {
    if (isnan(iterations) || isinf(iterations) || iterations <= 0) {
        tsc_throw_str(tsc_str_from_cstr("crypto.pbkdf2Sync: iterations must be a positive finite number"));
    }
    if (isnan(keylen) || isinf(keylen) || keylen < 0) {
        tsc_throw_str(tsc_str_from_cstr("crypto.pbkdf2Sync: keylen must be a non-negative finite number"));
    }

    const EVP_MD* md = NULL;
    if (str_lit_eq(digest, "sha1")) {
        md = EVP_sha1();
    } else if (str_lit_eq(digest, "sha256")) {
        md = EVP_sha256();
    } else if (str_lit_eq(digest, "sha512")) {
        md = EVP_sha512();
    } else {
        tsc_throw_str(tsc_str_from_cstr("crypto.pbkdf2Sync: only sha1, sha256, and sha512 are supported"));
    }

    tsc_buffer_t* out = tsc_buffer_alloc(keylen, 0.0);
    if (out->len == 0) {
        return out;
    }

    int res = PKCS5_PBKDF2_HMAC(
        (const char*)password_data, (int)password_len,
        (const unsigned char*)salt_data, (int)salt_len,
        (int)iterations, md, (int)out->len, out->data
    );

    if (res != 1) {
        tsc_throw_str(tsc_str_from_cstr("crypto.pbkdf2Sync: PKCS5_PBKDF2_HMAC failed"));
    }

    return out;
}

tsc_buffer_t* tsc_crypto_pbkdf2_sync_ss(const tsc_str_t* password, const tsc_str_t* salt, double iterations, double keylen, const tsc_str_t* digest) {
    const void* p_data = password ? (const void*)password->data : "";
    size_t p_len = password ? password->len : 0;
    const void* s_data = salt ? (const void*)salt->data : "";
    size_t s_len = salt ? salt->len : 0;
    return tsc_crypto_pbkdf2_sync_impl(p_data, p_len, s_data, s_len, iterations, keylen, digest);
}

tsc_buffer_t* tsc_crypto_pbkdf2_sync_sb(const tsc_str_t* password, const tsc_buffer_t* salt, double iterations, double keylen, const tsc_str_t* digest) {
    const void* p_data = password ? (const void*)password->data : "";
    size_t p_len = password ? password->len : 0;
    const void* s_data = salt ? (const void*)salt->data : NULL;
    size_t s_len = salt ? salt->len : 0;
    return tsc_crypto_pbkdf2_sync_impl(p_data, p_len, s_data, s_len, iterations, keylen, digest);
}

tsc_buffer_t* tsc_crypto_pbkdf2_sync_bs(const tsc_buffer_t* password, const tsc_str_t* salt, double iterations, double keylen, const tsc_str_t* digest) {
    const void* p_data = password ? (const void*)password->data : NULL;
    size_t p_len = password ? password->len : 0;
    const void* s_data = salt ? (const void*)salt->data : "";
    size_t s_len = salt ? salt->len : 0;
    return tsc_crypto_pbkdf2_sync_impl(p_data, p_len, s_data, s_len, iterations, keylen, digest);
}

tsc_buffer_t* tsc_crypto_pbkdf2_sync_bb(const tsc_buffer_t* password, const tsc_buffer_t* salt, double iterations, double keylen, const tsc_str_t* digest) {
    const void* p_data = password ? (const void*)password->data : NULL;
    size_t p_len = password ? password->len : 0;
    const void* s_data = salt ? (const void*)salt->data : NULL;
    size_t s_len = salt ? salt->len : 0;
    return tsc_crypto_pbkdf2_sync_impl(p_data, p_len, s_data, s_len, iterations, keylen, digest);
}

tsc_buffer_t* tsc_crypto_scrypt_sync_impl(const void* password_data, size_t password_len, const void* salt_data, size_t salt_len, double keylen, double N, double r, double p, double maxmem) {
    if (isnan(keylen) || isinf(keylen) || keylen < 0) {
        tsc_throw_str(tsc_str_from_cstr("crypto.scryptSync: keylen must be a non-negative finite number"));
    }
    if (isnan(N) || isinf(N) || N <= 1 || ((uint64_t)N & ((uint64_t)N - 1)) != 0) {
        tsc_throw_str(tsc_str_from_cstr("crypto.scryptSync: N must be a power of two greater than 1"));
    }
    if (isnan(r) || isinf(r) || r <= 0) {
        tsc_throw_str(tsc_str_from_cstr("crypto.scryptSync: r must be a positive finite number"));
    }
    if (isnan(p) || isinf(p) || p <= 0) {
        tsc_throw_str(tsc_str_from_cstr("crypto.scryptSync: p must be a positive finite number"));
    }
    if (isnan(maxmem) || isinf(maxmem) || maxmem <= 0) {
        tsc_throw_str(tsc_str_from_cstr("crypto.scryptSync: maxmem must be a positive finite number"));
    }

    tsc_buffer_t* out = tsc_buffer_alloc(keylen, 0.0);
    if (out->len == 0) {
        return out;
    }

    int res = EVP_PBE_scrypt(
        (const char*)password_data, password_len,
        (const unsigned char*)salt_data, salt_len,
        (uint64_t)N, (uint64_t)r, (uint64_t)p, (uint64_t)maxmem,
        out->data, (size_t)out->len
    );

    if (res != 1) {
        tsc_throw_str(tsc_str_from_cstr("crypto.scryptSync: EVP_PBE_scrypt failed"));
    }

    return out;
}

tsc_buffer_t* tsc_crypto_scrypt_sync_ss(const tsc_str_t* password, const tsc_str_t* salt, double keylen, double N, double r, double p, double maxmem) {
    const void* p_data = password ? (const void*)password->data : "";
    size_t p_len = password ? password->len : 0;
    const void* s_data = salt ? (const void*)salt->data : "";
    size_t s_len = salt ? salt->len : 0;
    return tsc_crypto_scrypt_sync_impl(p_data, p_len, s_data, s_len, keylen, N, r, p, maxmem);
}

tsc_buffer_t* tsc_crypto_scrypt_sync_sb(const tsc_str_t* password, const tsc_buffer_t* salt, double keylen, double N, double r, double p, double maxmem) {
    const void* p_data = password ? (const void*)password->data : "";
    size_t p_len = password ? password->len : 0;
    const void* s_data = salt ? (const void*)salt->data : NULL;
    size_t s_len = salt ? salt->len : 0;
    return tsc_crypto_scrypt_sync_impl(p_data, p_len, s_data, s_len, keylen, N, r, p, maxmem);
}

tsc_buffer_t* tsc_crypto_scrypt_sync_bs(const tsc_buffer_t* password, const tsc_str_t* salt, double keylen, double N, double r, double p, double maxmem) {
    const void* p_data = password ? (const void*)password->data : NULL;
    size_t p_len = password ? password->len : 0;
    const void* s_data = salt ? (const void*)salt->data : "";
    size_t s_len = salt ? salt->len : 0;
    return tsc_crypto_scrypt_sync_impl(p_data, p_len, s_data, s_len, keylen, N, r, p, maxmem);
}

tsc_buffer_t* tsc_crypto_scrypt_sync_bb(const tsc_buffer_t* password, const tsc_buffer_t* salt, double keylen, double N, double r, double p, double maxmem) {
    const void* p_data = password ? (const void*)password->data : NULL;
    size_t p_len = password ? password->len : 0;
    const void* s_data = salt ? (const void*)salt->data : NULL;
    size_t s_len = salt ? salt->len : 0;
    return tsc_crypto_scrypt_sync_impl(p_data, p_len, s_data, s_len, keylen, N, r, p, maxmem);
}

tsc_array_t* tsc_crypto_get_hashes(void) {
    tsc_array_t* a = tsc_array_new(sizeof(tsc_str_t*), 6);
    tsc_str_t* s1 = tsc_str_from_cstr("md5");
    tsc_array_push_raw(a, &s1);
    tsc_str_t* s2 = tsc_str_from_cstr("sha1");
    tsc_array_push_raw(a, &s2);
    tsc_str_t* s3 = tsc_str_from_cstr("sha224");
    tsc_array_push_raw(a, &s3);
    tsc_str_t* s4 = tsc_str_from_cstr("sha256");
    tsc_array_push_raw(a, &s4);
    tsc_str_t* s5 = tsc_str_from_cstr("sha384");
    tsc_array_push_raw(a, &s5);
    tsc_str_t* s6 = tsc_str_from_cstr("sha512");
    tsc_array_push_raw(a, &s6);
    return a;
}

void hash_update_bytes(tsc_hash_t* h, const void* data, size_t len) {
    if (h->finalized) return;
    if (len == 0) return;
    if (!h->ctx || EVP_DigestUpdate(h->ctx, data, len) != 1) {
        tsc_panic("Hash.update: could not update digest");
    }
}

tsc_hash_t* tsc_hash_update(tsc_hash_t* h, const tsc_str_t* data) {
    hash_update_bytes(h, data->data, data->len);
    return h;
}

tsc_hash_t* tsc_hash_update_buffer(tsc_hash_t* h, const tsc_buffer_t* data) {
    if (data) hash_update_bytes(h, data->data, data->len);
    return h;
}

tsc_str_t* tsc_hash_digest(tsc_hash_t* h, const tsc_str_t* encoding) {
    bool use_hex = str_lit_eq(encoding, "hex");
    bool use_base64 = str_lit_eq(encoding, "base64");
    if (!use_hex && !use_base64) {
        tsc_throw_str(tsc_str_from_cstr("Hash.digest: only hex and base64 encodings are supported"));
    }
    if (!h->finalized) {
        unsigned int digest_len = 0;
        if (!h->ctx || EVP_DigestFinal_ex(h->ctx, h->digest, &digest_len) != 1) {
            tsc_panic("Hash.digest: could not finalize digest");
        }
        h->digest_len = (size_t)digest_len;
        EVP_MD_CTX_free(h->ctx);
        h->ctx = NULL;
        h->finalized = true;
    }
    if (use_base64) {
        return str_from_base64_bytes(h->digest, h->digest_len);
    }
    static const char hex[] = "0123456789abcdef";
    tsc_str_t* out = str_alloc(h->digest_len * 2);
    char* p = (char*)out->data;
    for (size_t i = 0; i < h->digest_len; i++) {
        p[i * 2] = hex[h->digest[i] >> 4];
        p[i * 2 + 1] = hex[h->digest[i] & 0x0f];
    }
    return out;
}

tsc_buffer_t* tsc_child_process_exec_sync(const tsc_str_t* command, const tsc_str_t* cwd, const tsc_str_t* input, const tsc_array_t* env, const tsc_str_t* shell, double uid, double gid, double max_buffer, double timeout_ms, int timeout_signal) {
    if (!command) tsc_throw_str(tsc_str_from_cstr("child_process.execSync command required"));
    tsc_array_t* args = tsc_array_new(sizeof(tsc_str_t*), 2);
    tsc_str_t* flag = tsc_str_from_lit("-c", 2);
    tsc_str_t* cmd = (tsc_str_t*)command;
    tsc_array_push_raw(args, &flag);
    tsc_array_push_raw(args, &cmd);
    return tsc_child_process_exec_file_sync(shell ? shell : tsc_str_from_lit("/bin/sh", 7), args, cwd, input, env, NULL, NULL, uid, gid, max_buffer, timeout_ms, timeout_signal);
}

tsc_array_t* child_shell_args(const tsc_str_t* command, const tsc_array_t* args);
void child_capture_append(uint8_t** data, size_t* len, size_t* cap, const uint8_t* chunk, size_t n);
void child_capture_append_limited(uint8_t** data, size_t* len, size_t* cap, const uint8_t* chunk, size_t n, size_t max_len, bool* exceeded);

double child_now_millis(void) {
    struct timespec ts;
    if (clock_gettime(CLOCK_MONOTONIC, &ts) != 0) return 0.0;
    return (double)ts.tv_sec * 1000.0 + (double)ts.tv_nsec / 1000000.0;
}

void child_apply_env(const tsc_array_t* env) {
    if (!env) return;
    for (size_t i = 0; i < env->len; i++) {
        tsc_str_t* pair = TSC_ARR(tsc_str_t*, env, i);
        if (!pair) continue;
        char* raw = cstr_dup(pair);
        (void)putenv(raw);
    }
}

bool child_has_id_option(double value) {
    return !isnan(value) && !isinf(value) && value >= 0.0;
}

int child_apply_ids(double uid, double gid) {
    if (child_has_id_option(gid) && setgid((gid_t)gid) != 0) return errno;
    if (child_has_id_option(uid) && setuid((uid_t)uid) != 0) return errno;
    return 0;
}

size_t child_max_buffer_limit(double max_buffer) {
    if (isnan(max_buffer) || isinf(max_buffer) || max_buffer < 0.0) return SIZE_MAX;
    if (max_buffer >= (double)SIZE_MAX) return SIZE_MAX;
    return (size_t)floor(max_buffer);
}

tsc_buffer_t* tsc_child_process_exec_file_sync(const tsc_str_t* file, const tsc_array_t* args, const tsc_str_t* cwd, const tsc_str_t* input, const tsc_array_t* env, const tsc_str_t* shell, const tsc_str_t* argv0, double uid, double gid, double max_buffer, double timeout_ms, int timeout_signal) {
    if (!file) tsc_throw_str(tsc_str_from_cstr("child_process.execFileSync file required"));
    const tsc_str_t* actual_file = file;
    const tsc_array_t* actual_args = args;
    if (shell) {
        actual_file = shell;
        actual_args = child_shell_args(file, args);
    }
    int out_pipe[2];
    int err_pipe[2];
    int exec_err_pipe[2];
    int in_pipe[2] = { -1, -1 };
    if (pipe(out_pipe) != 0) tsc_panic("child_process.execFileSync pipe failed");
    if (pipe(err_pipe) != 0) {
        close(out_pipe[0]);
        close(out_pipe[1]);
        tsc_panic("child_process.execFileSync stderr pipe failed");
    }
    if (pipe(exec_err_pipe) != 0) {
        close(out_pipe[0]);
        close(out_pipe[1]);
        close(err_pipe[0]);
        close(err_pipe[1]);
        tsc_panic("child_process.execFileSync exec-error pipe failed");
    }
    int exec_err_flags = fcntl(exec_err_pipe[1], F_GETFD);
    if (exec_err_flags >= 0) (void)fcntl(exec_err_pipe[1], F_SETFD, exec_err_flags | FD_CLOEXEC);
    if (input && pipe(in_pipe) != 0) {
        close(out_pipe[0]);
        close(out_pipe[1]);
        close(err_pipe[0]);
        close(err_pipe[1]);
        close(exec_err_pipe[0]);
        close(exec_err_pipe[1]);
        tsc_panic("child_process.execFileSync stdin pipe failed");
    }

    pid_t pid = fork();
    if (pid < 0) {
        close(out_pipe[0]);
        close(out_pipe[1]);
        close(err_pipe[0]);
        close(err_pipe[1]);
        close(exec_err_pipe[0]);
        close(exec_err_pipe[1]);
        if (input) {
            close(in_pipe[0]);
            close(in_pipe[1]);
        }
        tsc_panic("child_process.execFileSync fork failed");
    }
    if (pid == 0) {
        close(out_pipe[0]);
        close(err_pipe[0]);
        close(exec_err_pipe[0]);
        if (input) close(in_pipe[1]);
        if (dup2(out_pipe[1], STDOUT_FILENO) < 0) {
            int err = errno;
            (void)write(exec_err_pipe[1], &err, sizeof(err));
            _exit(127);
        }
        if (dup2(err_pipe[1], STDERR_FILENO) < 0) {
            int err = errno;
            (void)write(exec_err_pipe[1], &err, sizeof(err));
            _exit(127);
        }
        if (input && dup2(in_pipe[0], STDIN_FILENO) < 0) {
            int err = errno;
            (void)write(exec_err_pipe[1], &err, sizeof(err));
            _exit(127);
        }
        close(out_pipe[1]);
        close(err_pipe[1]);
        if (input) close(in_pipe[0]);
        if (cwd) {
            char* cwd_cstr = cstr_dup(cwd);
            if (chdir(cwd_cstr) != 0) {
                int err = errno;
                (void)write(exec_err_pipe[1], &err, sizeof(err));
                _exit(127);
            }
            free(cwd_cstr);
        }
        child_apply_env(env);
        int id_err = child_apply_ids(uid, gid);
        if (id_err != 0) {
            (void)write(exec_err_pipe[1], &id_err, sizeof(id_err));
            _exit(127);
        }

        size_t argc = 1 + (actual_args ? actual_args->len : 0);
        char** argv = (char**)calloc(argc + 1, sizeof(char*));
        if (!argv) {
            int err = errno ? errno : ENOMEM;
            (void)write(exec_err_pipe[1], &err, sizeof(err));
            _exit(127);
        }
        argv[0] = cstr_dup(argv0 ? argv0 : actual_file);
        for (size_t i = 1; i < argc; i++) {
            tsc_str_t* arg = TSC_ARR(tsc_str_t*, actual_args, i - 1);
            argv[i] = cstr_dup(arg ? arg : tsc_str_from_lit("", 0));
        }
        argv[argc] = NULL;
        char* exec_file = cstr_dup(actual_file);
        execvp(exec_file, argv);
        int err = errno;
        (void)write(exec_err_pipe[1], &err, sizeof(err));
        _exit(127);
    }

    close(out_pipe[1]);
    close(err_pipe[1]);
    close(exec_err_pipe[1]);
    if (input) {
        close(in_pipe[0]);
        size_t written = 0;
        while (written < input->len) {
            ssize_t n = write(in_pipe[1], input->data + written, input->len - written);
            if (n > 0) {
                written += (size_t)n;
            } else if (n < 0 && errno == EINTR) {
                continue;
            } else {
                break;
            }
        }
        close(in_pipe[1]);
    }

    size_t len = 0;
    size_t cap = 256;
    size_t stderr_len = 0;
    size_t stderr_cap = 256;
    uint8_t* data = (uint8_t*)malloc(cap);
    uint8_t* stderr_data = (uint8_t*)malloc(stderr_cap);
    if (!data || !stderr_data) tsc_panic("child_process.execFileSync out of memory");

    struct pollfd fds[2];
    fds[0].fd = out_pipe[0];
    fds[0].events = POLLIN;
    fds[1].fd = err_pipe[0];
    fds[1].events = POLLIN;
    int open_fds = 2;
    bool timed_out = false;
    bool max_buffer_exceeded = false;
    bool killed_for_max_buffer = false;
    size_t max_buffer_len = child_max_buffer_limit(max_buffer);
    int kill_signal = timeout_signal > 0 ? timeout_signal : SIGTERM;
    double deadline = (!isnan(timeout_ms) && !isinf(timeout_ms) && timeout_ms >= 0.0)
        ? child_now_millis() + timeout_ms
        : -1.0;
    while (open_fds > 0) {
        int poll_timeout = -1;
        if (!timed_out && deadline >= 0.0) {
            double remaining = deadline - child_now_millis();
            if (remaining <= 0.0) {
                (void)kill(pid, kill_signal);
                timed_out = true;
            } else if (remaining > (double)INT_MAX) {
                poll_timeout = INT_MAX;
            } else {
                poll_timeout = (int)ceil(remaining);
                if (poll_timeout < 1) poll_timeout = 1;
            }
        }
        int rc = poll(fds, 2, poll_timeout);
        if (rc < 0) {
            if (errno == EINTR) continue;
            free(data);
            free(stderr_data);
            tsc_panic("child_process.execFileSync poll failed");
        }
        if (rc == 0 && !timed_out && deadline >= 0.0) {
            (void)kill(pid, kill_signal);
            timed_out = true;
            continue;
        }
        for (int i = 0; i < 2; i++) {
            if (fds[i].fd < 0) continue;
            if ((fds[i].revents & (POLLIN | POLLHUP | POLLERR)) == 0) continue;
            uint8_t chunk[256];
            ssize_t n = read(fds[i].fd, chunk, sizeof(chunk));
            if (n > 0) {
                if (i == 0) {
                    child_capture_append_limited(&data, &len, &cap, chunk, (size_t)n, max_buffer_len, &max_buffer_exceeded);
                } else {
                    child_capture_append_limited(&stderr_data, &stderr_len, &stderr_cap, chunk, (size_t)n, max_buffer_len, &max_buffer_exceeded);
                }
                if (max_buffer_exceeded && !killed_for_max_buffer && !timed_out) {
                    (void)kill(pid, SIGTERM);
                    killed_for_max_buffer = true;
                }
            } else if (n == 0) {
                close(fds[i].fd);
                fds[i].fd = -1;
                open_fds--;
            } else if (errno != EINTR) {
                free(data);
                free(stderr_data);
                tsc_panic("child_process.execFileSync failed while reading output");
            }
        }
    }

    int status = 0;
    while (waitpid(pid, &status, 0) < 0) {
        if (errno != EINTR) {
            free(data);
            free(stderr_data);
            close(exec_err_pipe[0]);
            tsc_panic("child_process.execFileSync wait failed");
        }
    }
    int exec_error = 0;
    for (;;) {
        ssize_t n = read(exec_err_pipe[0], &exec_error, sizeof(exec_error));
        if (n >= 0 || errno != EINTR) break;
    }
    close(exec_err_pipe[0]);
    if (timed_out) {
        free(data);
        free(stderr_data);
        tsc_throw_str(tsc_str_from_cstr("child_process.execFileSync command timed out"));
    }
    if (max_buffer_exceeded) {
        free(data);
        free(stderr_data);
        tsc_throw_str(tsc_str_from_cstr("child_process.execFileSync maxBuffer exceeded"));
    }
    if (exec_error) {
        free(data);
        free(stderr_data);
        tsc_throw_str(tsc_str_concat_n(2,
            tsc_str_from_lit("child_process.execFileSync failed: ", 35),
            child_errno_name(exec_error)));
    }
    if (!WIFEXITED(status) || WEXITSTATUS(status) != 0) {
        free(data);
        free(stderr_data);
        tsc_throw_str(tsc_str_from_cstr("child_process.execFileSync command failed"));
    }

    tsc_buffer_t* out = tsc_buffer_alloc((double)len, 0);
    if (len > 0) memcpy(out->data, data, len);
    free(data);
    free(stderr_data);
    return out;
}

void child_capture_append(uint8_t** data, size_t* len, size_t* cap, const uint8_t* chunk, size_t n) {
    if (*len + n > *cap) {
        while (*len + n > *cap) *cap *= 2;
        *data = (uint8_t*)realloc(*data, *cap);
        if (!*data) tsc_panic("child_process.spawnSync out of memory");
    }
    memcpy(*data + *len, chunk, n);
    *len += n;
}

void child_capture_append_limited(uint8_t** data, size_t* len, size_t* cap, const uint8_t* chunk, size_t n, size_t max_len, bool* exceeded) {
    size_t remaining = *len < max_len ? max_len - *len : 0;
    size_t take = n < remaining ? n : remaining;
    if (take > 0) child_capture_append(data, len, cap, chunk, take);
    if (take < n) *exceeded = true;
}

tsc_str_t* child_capture_string(const uint8_t* data, size_t len) {
    tsc_str_t* out = str_alloc(len);
    if (len > 0) memcpy((char*)out->data, data, len);
    return out;
}

tsc_value_t child_capture_value(const uint8_t* data, size_t len, bool return_utf8) {
    if (return_utf8) return tsc_value_string(child_capture_string(data, len));
    tsc_buffer_t* out = tsc_buffer_alloc((double)len, 0);
    if (len > 0) memcpy(out->data, data, len);
    return tsc_value_buffer(out);
}

tsc_str_t* child_signal_name(int sig) {
    switch (sig) {
#ifdef SIGHUP
        case SIGHUP: return tsc_str_from_lit("SIGHUP", 6);
#endif
#ifdef SIGINT
        case SIGINT: return tsc_str_from_lit("SIGINT", 6);
#endif
#ifdef SIGQUIT
        case SIGQUIT: return tsc_str_from_lit("SIGQUIT", 7);
#endif
#ifdef SIGILL
        case SIGILL: return tsc_str_from_lit("SIGILL", 6);
#endif
#ifdef SIGTRAP
        case SIGTRAP: return tsc_str_from_lit("SIGTRAP", 7);
#endif
#ifdef SIGABRT
        case SIGABRT: return tsc_str_from_lit("SIGABRT", 7);
#endif
#ifdef SIGBUS
        case SIGBUS: return tsc_str_from_lit("SIGBUS", 6);
#endif
#ifdef SIGFPE
        case SIGFPE: return tsc_str_from_lit("SIGFPE", 6);
#endif
#ifdef SIGKILL
        case SIGKILL: return tsc_str_from_lit("SIGKILL", 7);
#endif
#ifdef SIGUSR1
        case SIGUSR1: return tsc_str_from_lit("SIGUSR1", 7);
#endif
#ifdef SIGSEGV
        case SIGSEGV: return tsc_str_from_lit("SIGSEGV", 7);
#endif
#ifdef SIGUSR2
        case SIGUSR2: return tsc_str_from_lit("SIGUSR2", 7);
#endif
#ifdef SIGPIPE
        case SIGPIPE: return tsc_str_from_lit("SIGPIPE", 7);
#endif
#ifdef SIGALRM
        case SIGALRM: return tsc_str_from_lit("SIGALRM", 7);
#endif
#ifdef SIGTERM
        case SIGTERM: return tsc_str_from_lit("SIGTERM", 7);
#endif
        default: return tsc_str_from_lit("SIGUNKNOWN", 10);
    }
}

tsc_str_t* child_errno_name(int err) {
    switch (err) {
#ifdef EACCES
        case EACCES: return tsc_str_from_lit("EACCES", 6);
#endif
#ifdef ELOOP
        case ELOOP: return tsc_str_from_lit("ELOOP", 5);
#endif
#ifdef ENAMETOOLONG
        case ENAMETOOLONG: return tsc_str_from_lit("ENAMETOOLONG", 12);
#endif
#ifdef ENOENT
        case ENOENT: return tsc_str_from_lit("ENOENT", 6);
#endif
#ifdef ENOEXEC
        case ENOEXEC: return tsc_str_from_lit("ENOEXEC", 7);
#endif
#ifdef ENOMEM
        case ENOMEM: return tsc_str_from_lit("ENOMEM", 6);
#endif
#ifdef ENOTDIR
        case ENOTDIR: return tsc_str_from_lit("ENOTDIR", 7);
#endif
        default: return tsc_str_from_lit("EUNKNOWN", 8);
    }
}

tsc_str_t* child_shell_quote_arg(const tsc_str_t* arg) {
    if (!arg) return tsc_str_from_lit("''", 2);
    size_t extra = 2;
    for (size_t i = 0; i < arg->len; i++) {
        extra += arg->data[i] == '\'' ? 4 : 1;
    }
    tsc_str_t* out = str_alloc(extra);
    char* p = (char*)out->data;
    size_t pos = 0;
    p[pos++] = '\'';
    for (size_t i = 0; i < arg->len; i++) {
        if (arg->data[i] == '\'') {
            p[pos++] = '\'';
            p[pos++] = '\\';
            p[pos++] = '\'';
            p[pos++] = '\'';
        } else {
            p[pos++] = arg->data[i];
        }
    }
    p[pos++] = '\'';
    return out;
}

tsc_array_t* child_shell_args(const tsc_str_t* command, const tsc_array_t* args) {
    tsc_str_t* joined = (tsc_str_t*)command;
    if (!joined) joined = tsc_str_from_lit("", 0);
    for (size_t i = 0; args && i < args->len; i++) {
        tsc_str_t* arg = TSC_ARR(tsc_str_t*, args, i);
        joined = tsc_str_concat_n(3, joined, tsc_str_from_lit(" ", 1), child_shell_quote_arg(arg));
    }
    tsc_array_t* out = tsc_array_new(sizeof(tsc_str_t*), 2);
    tsc_str_t* flag = tsc_str_from_lit("-c", 2);
    tsc_array_push_raw(out, &flag);
    tsc_array_push_raw(out, &joined);
    return out;
}

tsc_value_t tsc_child_process_spawn_sync(const tsc_str_t* file, const tsc_array_t* args, const tsc_str_t* cwd, const tsc_str_t* input, const tsc_array_t* env, const tsc_str_t* shell, const tsc_str_t* argv0, bool pipe_stdin, bool ignore_stdin, bool capture_stdout, bool capture_stderr, bool inherit_stdout, bool inherit_stderr, bool detached, double uid, double gid, double max_buffer, double timeout_ms, int timeout_signal, bool return_utf8) {
    if (!file) tsc_panic("child_process.spawnSync file required");
    const tsc_str_t* actual_file = file;
    const tsc_array_t* actual_args = args;
    if (shell) {
        actual_file = shell;
        actual_args = child_shell_args(file, args);
    }
    int out_pipe[2];
    int err_pipe[2];
    int exec_err_pipe[2];
    int in_pipe[2] = { -1, -1 };
    if (pipe(out_pipe) != 0 || pipe(err_pipe) != 0) {
        tsc_panic("child_process.spawnSync pipe failed");
    }
    if (pipe(exec_err_pipe) != 0) {
        close(out_pipe[0]);
        close(out_pipe[1]);
        close(err_pipe[0]);
        close(err_pipe[1]);
        tsc_panic("child_process.spawnSync exec-error pipe failed");
    }
    int flags = fcntl(exec_err_pipe[1], F_GETFD);
    if (flags >= 0) (void)fcntl(exec_err_pipe[1], F_SETFD, flags | FD_CLOEXEC);
    if (pipe_stdin && pipe(in_pipe) != 0) {
        close(exec_err_pipe[0]);
        close(exec_err_pipe[1]);
        tsc_panic("child_process.spawnSync stdin pipe failed");
    }

    pid_t pid = fork();
    if (pid < 0) {
        close(out_pipe[0]);
        close(out_pipe[1]);
        close(err_pipe[0]);
        close(err_pipe[1]);
        close(exec_err_pipe[0]);
        close(exec_err_pipe[1]);
        if (pipe_stdin) {
            close(in_pipe[0]);
            close(in_pipe[1]);
        }
        tsc_panic("child_process.spawnSync fork failed");
    }
    if (pid == 0) {
        close(out_pipe[0]);
        close(err_pipe[0]);
        close(exec_err_pipe[0]);
        if (pipe_stdin) close(in_pipe[1]);
        if (ignore_stdin) {
            int null_fd = open("/dev/null", O_RDONLY);
            if (null_fd < 0) _exit(127);
            if (dup2(null_fd, STDIN_FILENO) < 0) _exit(127);
            close(null_fd);
        }
        if (!inherit_stdout && dup2(out_pipe[1], STDOUT_FILENO) < 0) _exit(127);
        if (!inherit_stderr && dup2(err_pipe[1], STDERR_FILENO) < 0) _exit(127);
        if (pipe_stdin && dup2(in_pipe[0], STDIN_FILENO) < 0) _exit(127);
        close(out_pipe[1]);
        close(err_pipe[1]);
        if (pipe_stdin) close(in_pipe[0]);
        if (detached && setsid() < 0) {
            int err = errno;
            (void)write(exec_err_pipe[1], &err, sizeof(err));
            _exit(127);
        }
        if (cwd) {
            char* cwd_cstr = cstr_dup(cwd);
            if (chdir(cwd_cstr) != 0) {
                int err = errno;
                (void)write(exec_err_pipe[1], &err, sizeof(err));
                _exit(127);
            }
            free(cwd_cstr);
        }
        child_apply_env(env);
        int id_err = child_apply_ids(uid, gid);
        if (id_err != 0) {
            (void)write(exec_err_pipe[1], &id_err, sizeof(id_err));
            _exit(127);
        }

        size_t argc = 1 + (actual_args ? actual_args->len : 0);
        char** argv = (char**)calloc(argc + 1, sizeof(char*));
        if (!argv) _exit(127);
        argv[0] = cstr_dup(argv0 ? argv0 : actual_file);
        for (size_t i = 1; i < argc; i++) {
            tsc_str_t* arg = TSC_ARR(tsc_str_t*, actual_args, i - 1);
            argv[i] = cstr_dup(arg ? arg : tsc_str_from_lit("", 0));
        }
        argv[argc] = NULL;
        char* exec_file = cstr_dup(actual_file);
        execvp(exec_file, argv);
        int err = errno;
        (void)write(exec_err_pipe[1], &err, sizeof(err));
        _exit(127);
    }

    close(out_pipe[1]);
    close(err_pipe[1]);
    close(exec_err_pipe[1]);
    if (pipe_stdin) {
        close(in_pipe[0]);
        size_t written = 0;
        while (input && written < input->len) {
            ssize_t n = write(in_pipe[1], input->data + written, input->len - written);
            if (n > 0) {
                written += (size_t)n;
            } else if (n < 0 && errno == EINTR) {
                continue;
            } else {
                break;
            }
        }
        close(in_pipe[1]);
    }
    size_t stdout_len = 0;
    size_t stderr_len = 0;
    size_t stdout_cap = 256;
    size_t stderr_cap = 256;
    uint8_t* stdout_data = (uint8_t*)malloc(stdout_cap);
    uint8_t* stderr_data = (uint8_t*)malloc(stderr_cap);
    if (!stdout_data || !stderr_data) tsc_panic("child_process.spawnSync out of memory");

    struct pollfd fds[2];
    fds[0].fd = out_pipe[0];
    fds[0].events = POLLIN;
    fds[1].fd = err_pipe[0];
    fds[1].events = POLLIN;
    int open_fds = 2;
    bool timed_out = false;
    bool max_buffer_exceeded = false;
    bool killed_for_max_buffer = false;
    size_t max_buffer_len = child_max_buffer_limit(max_buffer);
    int kill_signal = timeout_signal > 0 ? timeout_signal : SIGTERM;
    double deadline = (!isnan(timeout_ms) && !isinf(timeout_ms) && timeout_ms >= 0.0)
        ? child_now_millis() + timeout_ms
        : -1.0;
    while (open_fds > 0) {
        int poll_timeout = -1;
        if (!timed_out && deadline >= 0.0) {
            double remaining = deadline - child_now_millis();
            if (remaining <= 0.0) {
                (void)kill(pid, kill_signal);
                timed_out = true;
            } else if (remaining > (double)INT_MAX) {
                poll_timeout = INT_MAX;
            } else {
                poll_timeout = (int)ceil(remaining);
                if (poll_timeout < 1) poll_timeout = 1;
            }
        }
        int rc = poll(fds, 2, poll_timeout);
        if (rc < 0) {
            if (errno == EINTR) continue;
            free(stdout_data);
            free(stderr_data);
            tsc_panic("child_process.spawnSync poll failed");
        }
        if (rc == 0 && !timed_out && deadline >= 0.0) {
            (void)kill(pid, kill_signal);
            timed_out = true;
            continue;
        }
        for (int i = 0; i < 2; i++) {
            if (fds[i].fd < 0) continue;
            if ((fds[i].revents & (POLLIN | POLLHUP | POLLERR)) == 0) continue;
            uint8_t chunk[256];
            ssize_t n = read(fds[i].fd, chunk, sizeof(chunk));
            if (n > 0) {
                if (i == 0) {
                    if (capture_stdout) {
                        child_capture_append_limited(&stdout_data, &stdout_len, &stdout_cap, chunk, (size_t)n, max_buffer_len, &max_buffer_exceeded);
                    }
                } else {
                    if (capture_stderr) {
                        child_capture_append_limited(&stderr_data, &stderr_len, &stderr_cap, chunk, (size_t)n, max_buffer_len, &max_buffer_exceeded);
                    }
                }
                if (max_buffer_exceeded && !killed_for_max_buffer && !timed_out) {
                    (void)kill(pid, SIGTERM);
                    killed_for_max_buffer = true;
                }
            } else if (n == 0) {
                close(fds[i].fd);
                fds[i].fd = -1;
                open_fds--;
            } else if (errno != EINTR) {
                free(stdout_data);
                free(stderr_data);
                tsc_panic("child_process.spawnSync failed while reading output");
            }
        }
    }

    int status = 0;
    while (waitpid(pid, &status, 0) < 0) {
        if (errno != EINTR) {
            free(stdout_data);
            free(stderr_data);
            close(exec_err_pipe[0]);
            tsc_panic("child_process.spawnSync wait failed");
        }
    }

    int exec_error = 0;
    for (;;) {
        ssize_t n = read(exec_err_pipe[0], &exec_error, sizeof(exec_error));
        if (n >= 0 || errno != EINTR) break;
    }
    close(exec_err_pipe[0]);

    tsc_value_t status_value = (exec_error || timed_out || max_buffer_exceeded)
        ? tsc_value_null()
        : (WIFEXITED(status) ? tsc_value_num((double)WEXITSTATUS(status)) : tsc_value_null());
    tsc_value_t signal_value = (!exec_error && WIFSIGNALED(status))
        ? tsc_value_string(child_signal_name(WTERMSIG(status)))
        : tsc_value_null();
    tsc_value_t error_value = timed_out
        ? tsc_value_string(tsc_str_from_lit("ETIMEDOUT", 9))
        : (max_buffer_exceeded
            ? tsc_value_string(tsc_str_from_lit("ENOBUFS", 7))
        : (exec_error
            ? tsc_value_string(child_errno_name(exec_error))
            : tsc_value_undefined()));
    tsc_value_t stdin_value = tsc_value_null();
    tsc_value_t stdout_value = capture_stdout
        ? child_capture_value(stdout_data, stdout_len, return_utf8)
        : tsc_value_null();
    tsc_value_t stderr_value = capture_stderr
        ? child_capture_value(stderr_data, stderr_len, return_utf8)
        : tsc_value_null();
    tsc_array_t* output = tsc_array_new(sizeof(tsc_value_t), 3);
    tsc_array_push_raw(output, &stdin_value);
    tsc_array_push_raw(output, &stdout_value);
    tsc_array_push_raw(output, &stderr_value);

    tsc_object_t* out = tsc_object_new();
    tsc_object_set(out, tsc_str_from_lit("status", 6), status_value);
    tsc_object_set(out, tsc_str_from_lit("stdout", 6), stdout_value);
    tsc_object_set(out, tsc_str_from_lit("stderr", 6), stderr_value);
    tsc_object_set(out, tsc_str_from_lit("output", 6), tsc_value_array(output));
    tsc_object_set(out, tsc_str_from_lit("pid", 3), tsc_value_num((double)pid));
    tsc_object_set(out, tsc_str_from_lit("signal", 6), signal_value);
    tsc_object_set(out, tsc_str_from_lit("error", 5), error_value);
    free(stdout_data);
    free(stderr_data);
    return tsc_value_object(out);
}

tsc_value_t tsc_child_process_exec_utf8(const tsc_str_t* command, const tsc_str_t* cwd, const tsc_array_t* env, const tsc_str_t* shell, double uid, double gid, double max_buffer, double timeout_ms, int timeout_signal) {
    tsc_array_t* args = tsc_array_new(sizeof(tsc_str_t*), 2);
    tsc_str_t* flag = tsc_str_from_lit("-c", 2);
    tsc_str_t* cmd = (tsc_str_t*)command;
    tsc_array_push_raw(args, &flag);
    tsc_array_push_raw(args, &cmd);
    return tsc_child_process_spawn_sync(shell ? shell : tsc_str_from_lit("/bin/sh", 7), args, cwd, NULL, env, NULL, NULL, true, false, true, true, false, false, false, uid, gid, max_buffer, timeout_ms, timeout_signal, true);
}

/* ---------------- URL ---------------- */

tsc_str_t* str_from_range(const char* data, size_t start, size_t end) {
    if (end < start) end = start;
    tsc_str_t* out = str_alloc(end - start);
    if (end > start) memcpy((char*)out->data, data + start, end - start);
    return out;
}

size_t find_byte(const char* data, size_t start, size_t end, char needle) {
    for (size_t i = start; i < end; i++) {
        if (data[i] == needle) return i;
    }
    return (size_t)-1;
}

size_t first_of_url_tail(const char* data, size_t start, size_t end) {
    for (size_t i = start; i < end; i++) {
        if (data[i] == '/' || data[i] == '?' || data[i] == '#') return i;
    }
    return end;
}

bool tsc_url_can_parse(const tsc_str_t* input) {
    const char* d = input->data;
    size_t n = input->len;
    size_t scheme_colon = find_byte(d, 0, n, ':');
    return scheme_colon != (size_t)-1 &&
        scheme_colon + 2 < n &&
        d[scheme_colon + 1] == '/' &&
        d[scheme_colon + 2] == '/';
}

tsc_str_t* tsc_url_resolve_base(const tsc_str_t* input, const tsc_str_t* base) {
    if (tsc_url_can_parse(input)) return (tsc_str_t*)input;
    if (!base || !tsc_url_can_parse(base)) return NULL;

    tsc_url_t* b = tsc_url_new(base);
    if (input->len >= 2 && input->data[0] == '/' && input->data[1] == '/') {
        return tsc_str_concat(b->protocol, input);
    }
    if (input->len > 0 && input->data[0] == '/') {
        return tsc_str_concat(b->origin, input);
    }
    if (input->len > 0 && input->data[0] == '?') {
        return tsc_str_concat(tsc_str_concat(b->origin, b->pathname), input);
    }
    if (input->len > 0 && input->data[0] == '#') {
        return tsc_str_concat(tsc_str_concat(tsc_str_concat(b->origin, b->pathname), b->search), input);
    }

    size_t slash = b->pathname->len;
    while (slash > 0 && b->pathname->data[slash - 1] != '/') slash--;
    tsc_str_t* dir = str_from_range(b->pathname->data, 0, slash);
    tsc_str_t* path = tsc_str_concat(dir, input);
    if (path->len == 0 || path->data[0] != '/') {
        path = tsc_str_concat(tsc_str_from_lit("/", 1), path);
    }
    return tsc_str_concat(b->origin, path);
}

bool tsc_url_can_parse_base(const tsc_str_t* input, const tsc_str_t* base) {
    tsc_str_t* resolved = tsc_url_resolve_base(input, base);
    return resolved && tsc_url_can_parse(resolved);
}

int url_hex_value(char ch) {
    if (ch >= '0' && ch <= '9') return ch - '0';
    if (ch >= 'a' && ch <= 'f') return ch - 'a' + 10;
    if (ch >= 'A' && ch <= 'F') return ch - 'A' + 10;
    return -1;
}

tsc_str_t* url_percent_decode_path(const tsc_str_t* path) {
    size_t out_len = 0;
    for (size_t i = 0; i < path->len; i++) {
        if (path->data[i] == '%') {
            if (i + 2 >= path->len || url_hex_value(path->data[i + 1]) < 0 || url_hex_value(path->data[i + 2]) < 0) {
                tsc_throw_str(tsc_str_from_cstr("URL: invalid percent escape in file URL path"));
            }
            i += 2;
        }
        out_len++;
    }
    tsc_str_t* out = str_alloc(out_len);
    char* dst = (char*)out->data;
    size_t pos = 0;
    for (size_t i = 0; i < path->len; i++) {
        if (path->data[i] == '%') {
            int hi = url_hex_value(path->data[i + 1]);
            int lo = url_hex_value(path->data[i + 2]);
            dst[pos++] = (char)((hi << 4) | lo);
            i += 2;
        } else {
            dst[pos++] = path->data[i];
        }
    }
    return out;
}

bool url_path_encode_byte(unsigned char ch) {
    return ch <= 0x20 || ch >= 0x7f || ch == '%' || ch == '#' || ch == '?';
}

tsc_str_t* url_percent_encode_path(const tsc_str_t* path) {
    static const char hex[] = "0123456789ABCDEF";
    size_t out_len = 0;
    for (size_t i = 0; i < path->len; i++) {
        unsigned char ch = (unsigned char)path->data[i];
        out_len += url_path_encode_byte(ch) ? 3 : 1;
    }
    tsc_str_t* out = str_alloc(out_len);
    char* dst = (char*)out->data;
    size_t pos = 0;
    for (size_t i = 0; i < path->len; i++) {
        unsigned char ch = (unsigned char)path->data[i];
        if (url_path_encode_byte(ch)) {
            dst[pos++] = '%';
            dst[pos++] = hex[ch >> 4];
            dst[pos++] = hex[ch & 15];
        } else {
            dst[pos++] = (char)ch;
        }
    }
    return out;
}

tsc_url_t* tsc_url_new(const tsc_str_t* input) {
    const char* d = input->data;
    size_t n = input->len;
    tsc_url_t* u = (tsc_url_t*)TSC_GC_MALLOC(sizeof(tsc_url_t));
    u->href = (tsc_str_t*)input;
    u->protocol = tsc_str_from_lit("", 0);
    u->host = tsc_str_from_lit("", 0);
    u->hostname = tsc_str_from_lit("", 0);
    u->port = tsc_str_from_lit("", 0);
    u->pathname = tsc_str_from_lit("/", 1);
    u->search = tsc_str_from_lit("", 0);
    u->hash = tsc_str_from_lit("", 0);
    u->origin = tsc_str_from_lit("", 0);

    size_t scheme_colon = find_byte(d, 0, n, ':');
    if (!tsc_url_can_parse(input)) {
        tsc_throw_str(tsc_str_from_cstr("URL: only absolute URLs with // authority are supported"));
    }
    u->protocol = str_from_range(d, 0, scheme_colon + 1);

    size_t authority_start = scheme_colon + 3;
    size_t authority_end = first_of_url_tail(d, authority_start, n);
    u->host = str_from_range(d, authority_start, authority_end);

    size_t port_colon = find_byte(d, authority_start, authority_end, ':');
    if (port_colon == (size_t)-1) {
        u->hostname = str_from_range(d, authority_start, authority_end);
    } else {
        u->hostname = str_from_range(d, authority_start, port_colon);
        u->port = str_from_range(d, port_colon + 1, authority_end);
    }

    size_t hash_pos = find_byte(d, authority_end, n, '#');
    size_t query_pos = find_byte(d, authority_end, hash_pos == (size_t)-1 ? n : hash_pos, '?');
    size_t path_end = n;
    if (query_pos != (size_t)-1) path_end = query_pos;
    if (hash_pos != (size_t)-1 && hash_pos < path_end) path_end = hash_pos;
    if (authority_end < n && d[authority_end] == '/') {
        u->pathname = str_from_range(d, authority_end, path_end);
    }
    if (query_pos != (size_t)-1) {
        size_t search_end = hash_pos != (size_t)-1 && hash_pos > query_pos ? hash_pos : n;
        u->search = str_from_range(d, query_pos, search_end);
    }
    if (hash_pos != (size_t)-1) {
        u->hash = str_from_range(d, hash_pos, n);
    }
    tsc_str_t* slash = tsc_str_from_lit("//", 2);
    u->origin = tsc_str_concat(tsc_str_concat(u->protocol, slash), u->host);
    return u;
}

tsc_url_t* tsc_url_new_base(const tsc_str_t* input, const tsc_str_t* base) {
    tsc_str_t* resolved = tsc_url_resolve_base(input, base);
    if (!resolved) {
        tsc_throw_str(tsc_str_from_cstr("URL: base URL must be absolute when resolving relative input"));
    }
    return tsc_url_new(resolved);
}

tsc_str_t* tsc_url_file_path(const tsc_url_t* url) {
    if (!url || !tsc_str_eq(url->protocol, tsc_str_from_lit("file:", 5))) {
        tsc_throw_str(tsc_str_from_cstr("URL: filesystem paths only support file: URLs"));
    }
    if (url->host->len != 0 && !tsc_str_eq(url->host, tsc_str_from_lit("localhost", 9))) {
        tsc_throw_str(tsc_str_from_cstr("URL: filesystem file: URLs must not have a remote host"));
    }
    return url_percent_decode_path(url->pathname);
}

tsc_str_t* tsc_url_file_url_to_path(const tsc_str_t* input) {
    return tsc_url_file_path(tsc_url_new(input));
}

tsc_url_t* tsc_url_path_to_file_url(const tsc_str_t* path) {
    tsc_str_t* absolute = tsc_path_is_absolute(path) ? (tsc_str_t*)path : tsc_path_resolve(1, path);
    absolute = tsc_path_normalize(absolute);
    if (!tsc_path_is_absolute(absolute)) {
        absolute = tsc_str_concat(tsc_str_from_lit("/", 1), absolute);
    }
    tsc_str_t* encoded = url_percent_encode_path(absolute);
    return tsc_url_new(tsc_str_concat(tsc_str_from_lit("file://", 7), encoded));
}

static tsc_str_t* url_query_decode_range(const char* data, size_t start, size_t end) {
    tsc_str_t* out = str_alloc(end - start);
    char* w = (char*)out->data;
    size_t j = 0;
    for (size_t i = start; i < end; i++) {
        if (data[i] == '+') {
            w[j++] = ' ';
        } else if (data[i] == '%' && i + 2 < end && url_hex_value(data[i + 1]) >= 0 && url_hex_value(data[i + 2]) >= 0) {
            int hi = url_hex_value(data[i + 1]);
            int lo = url_hex_value(data[i + 2]);
            w[j++] = (char)((hi << 4) | lo);
            i += 2;
        } else {
            w[j++] = data[i];
        }
    }
    out->len = j;
    ((char*)out->data)[j] = '\0';
    return out;
}

static bool url_query_encode_byte(unsigned char ch) {
    if ((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || (ch >= '0' && ch <= '9')) return false;
    return !(ch == '*' || ch == '-' || ch == '.' || ch == '_');
}

static tsc_str_t* url_query_encode(const tsc_str_t* input) {
    size_t out_len = 0;
    for (size_t i = 0; i < input->len; i++) {
        unsigned char ch = (unsigned char)input->data[i];
        out_len += ch == ' ' ? 1 : (url_query_encode_byte(ch) ? 3 : 1);
    }
    tsc_str_t* out = str_alloc(out_len);
    char* w = (char*)out->data;
    size_t j = 0;
    static const char hex[] = "0123456789ABCDEF";
    for (size_t i = 0; i < input->len; i++) {
        unsigned char ch = (unsigned char)input->data[i];
        if (ch == ' ') {
            w[j++] = '+';
        } else if (url_query_encode_byte(ch)) {
            w[j++] = '%';
            w[j++] = hex[ch >> 4];
            w[j++] = hex[ch & 15];
        } else {
            w[j++] = (char)ch;
        }
    }
    return out;
}

static void tsc_url_search_params_reserve(tsc_url_search_params_t* params, size_t need) {
    if (params->cap >= need) return;
    size_t next = params->cap ? params->cap * 2 : 4;
    while (next < need) next *= 2;
    params->items = (tsc_url_search_param_t*)TSC_GC_REALLOC(params->items, next * sizeof(tsc_url_search_param_t));
    params->cap = next;
}

void tsc_url_search_params_append(tsc_url_search_params_t* params, const tsc_str_t* name, const tsc_str_t* value) {
    tsc_url_search_params_reserve(params, params->len + 1);
    params->items[params->len].name = (tsc_str_t*)name;
    params->items[params->len].value = (tsc_str_t*)value;
    params->len++;
}

tsc_url_search_params_t* tsc_url_search_params_new(const tsc_str_t* init) {
    tsc_url_search_params_t* params = (tsc_url_search_params_t*)TSC_GC_MALLOC(sizeof(tsc_url_search_params_t));
    params->items = NULL;
    params->len = 0;
    params->cap = 0;
    if (!init || init->len == 0) return params;
    const char* d = init->data;
    size_t n = init->len;
    size_t start = (n > 0 && d[0] == '?') ? 1 : 0;
    while (start <= n) {
        size_t amp = find_byte(d, start, n, '&');
        size_t end = amp == (size_t)-1 ? n : amp;
        if (end > start) {
            size_t eq = find_byte(d, start, end, '=');
            size_t name_end = eq == (size_t)-1 ? end : eq;
            size_t value_start = eq == (size_t)-1 ? end : eq + 1;
            tsc_url_search_params_append(
                params,
                url_query_decode_range(d, start, name_end),
                url_query_decode_range(d, value_start, end)
            );
        }
        if (amp == (size_t)-1) break;
        start = amp + 1;
    }
    return params;
}

void tsc_url_search_params_delete(tsc_url_search_params_t* params, const tsc_str_t* name, const tsc_str_t* value) {
    size_t w = 0;
    for (size_t i = 0; i < params->len; i++) {
        bool match = tsc_str_eq(params->items[i].name, name) && (!value || tsc_str_eq(params->items[i].value, value));
        if (!match) {
            params->items[w++] = params->items[i];
        }
    }
    params->len = w;
}

tsc_str_t* tsc_url_search_params_get(const tsc_url_search_params_t* params, const tsc_str_t* name) {
    for (size_t i = 0; i < params->len; i++) {
        if (tsc_str_eq(params->items[i].name, name)) return params->items[i].value;
    }
    return NULL;
}

tsc_array_t* tsc_url_search_params_get_all(const tsc_url_search_params_t* params, const tsc_str_t* name) {
    size_t count = 0;
    for (size_t i = 0; i < params->len; i++) {
        if (tsc_str_eq(params->items[i].name, name)) {
            count++;
        }
    }
    tsc_array_t* a = tsc_array_new(sizeof(tsc_str_t*), count ? count : 1);
    size_t w = 0;
    for (size_t i = 0; i < params->len; i++) {
        if (tsc_str_eq(params->items[i].name, name)) {
            ((tsc_str_t**)a->data)[w++] = params->items[i].value;
        }
    }
    a->len = count;
    return a;
}

bool tsc_url_search_params_has(const tsc_url_search_params_t* params, const tsc_str_t* name, const tsc_str_t* value) {
    for (size_t i = 0; i < params->len; i++) {
        if (tsc_str_eq(params->items[i].name, name) && (!value || tsc_str_eq(params->items[i].value, value))) {
            return true;
        }
    }
    return false;
}

void tsc_url_search_params_set(tsc_url_search_params_t* params, const tsc_str_t* name, const tsc_str_t* value) {
    bool found = false;
    size_t w = 0;
    for (size_t i = 0; i < params->len; i++) {
        if (tsc_str_eq(params->items[i].name, name)) {
            if (!found) {
                params->items[w].name = (tsc_str_t*)name;
                params->items[w].value = (tsc_str_t*)value;
                w++;
                found = true;
            }
        } else {
            params->items[w++] = params->items[i];
        }
    }
    params->len = w;
    if (!found) tsc_url_search_params_append(params, name, value);
}

tsc_str_t* tsc_url_search_params_to_string(const tsc_url_search_params_t* params) {
    if (!params || params->len == 0) return tsc_str_from_lit("", 0);
    tsc_str_t** names = (tsc_str_t**)TSC_GC_MALLOC(sizeof(tsc_str_t*) * params->len);
    tsc_str_t** values = (tsc_str_t**)TSC_GC_MALLOC(sizeof(tsc_str_t*) * params->len);
    size_t total = params->len > 0 ? params->len - 1 : 0;
    for (size_t i = 0; i < params->len; i++) {
        names[i] = url_query_encode(params->items[i].name);
        values[i] = url_query_encode(params->items[i].value);
        total += names[i]->len + 1 + values[i]->len;
    }
    tsc_str_t* out = str_alloc(total);
    char* w = (char*)out->data;
    size_t j = 0;
    for (size_t i = 0; i < params->len; i++) {
        if (i > 0) w[j++] = '&';
        memcpy(w + j, names[i]->data, names[i]->len);
        j += names[i]->len;
        w[j++] = '=';
        memcpy(w + j, values[i]->data, values[i]->len);
        j += values[i]->len;
    }
    return out;
}

tsc_array_t* tsc_url_search_params_keys(const tsc_url_search_params_t* params) {
    tsc_array_t* a = tsc_array_new(sizeof(tsc_str_t*), params->len ? params->len : 1);
    for (size_t i = 0; i < params->len; i++) {
        ((tsc_str_t**)a->data)[i] = params->items[i].name;
    }
    a->len = params->len;
    return a;
}

tsc_array_t* tsc_url_search_params_values(const tsc_url_search_params_t* params) {
    tsc_array_t* a = tsc_array_new(sizeof(tsc_str_t*), params->len ? params->len : 1);
    for (size_t i = 0; i < params->len; i++) {
        ((tsc_str_t**)a->data)[i] = params->items[i].value;
    }
    a->len = params->len;
    return a;
}

tsc_array_t* tsc_url_search_params_entries(const tsc_url_search_params_t* params) {
    tsc_array_t* a = tsc_array_new(sizeof(tsc_object_entry_t), params->len ? params->len : 1);
    tsc_object_entry_t* entries = (tsc_object_entry_t*)a->data;
    for (size_t i = 0; i < params->len; i++) {
        entries[i].key = params->items[i].name;
        entries[i].ptr = (void*)params->items[i].value;
    }
    a->len = params->len;
    return a;
}

void tsc_url_search_params_sort(tsc_url_search_params_t* params) {
    if (!params || params->len <= 1) return;
    for (size_t i = 1; i < params->len; i++) {
        tsc_url_search_param_t key = params->items[i];
        size_t j = i;
        while (j > 0 && tsc_str_cmp(params->items[j - 1].name, key.name) > 0) {
            params->items[j] = params->items[j - 1];
            j--;
        }
        params->items[j] = key;
    }
}


int tsc_dns_lookup_ai_flags(double hints) {
    if (isnan(hints) || isinf(hints)) return 0;
    int flags = (int)hints;
    int out = 0;
#ifdef AI_V4MAPPED
    if ((flags & 8) != 0) out |= AI_V4MAPPED;
#endif
#ifdef AI_ALL
    if ((flags & 16) != 0) out |= AI_ALL;
#endif
#ifdef AI_ADDRCONFIG
    if ((flags & 32) != 0) out |= AI_ADDRCONFIG;
#endif
    return out;
}

static const char* tsc_dns_default_result_order = "verbatim";

static const char* tsc_dns_effective_result_order(double order_value) {
    if (order_value == 1.0) return "verbatim";
    if (order_value == 2.0) return "ipv4first";
    if (order_value == 3.0) return "ipv6first";
    return tsc_dns_default_result_order;
}

static bool tsc_dns_addrinfo_entry(struct addrinfo* cur, tsc_str_t** address, double* family) {
    char buf[INET6_ADDRSTRLEN];
    void* src = NULL;
    if (cur->ai_family == AF_INET) {
        src = &((struct sockaddr_in*)cur->ai_addr)->sin_addr;
        *family = 4.0;
    } else if (cur->ai_family == AF_INET6) {
        src = &((struct sockaddr_in6*)cur->ai_addr)->sin6_addr;
        *family = 6.0;
    } else {
        return false;
    }
    if (!src || !inet_ntop(cur->ai_family, src, buf, sizeof(buf))) return false;
    *address = tsc_str_from_cstr(buf);
    return true;
}

static void tsc_dns_lookup_all_append_family(tsc_array_t* addresses, struct addrinfo* result, int wanted_family) {
    for (struct addrinfo* cur = result; cur; cur = cur->ai_next) {
        if (wanted_family != AF_UNSPEC && cur->ai_family != wanted_family) continue;
        tsc_str_t* address = NULL;
        double resolved_family = 0.0;
        if (tsc_dns_addrinfo_entry(cur, &address, &resolved_family)) {
            tsc_object_t* entry = tsc_object_new();
            tsc_object_set(entry, tsc_str_from_lit("address", 7), tsc_value_string(address));
            tsc_object_set(entry, tsc_str_from_lit("family", 6), tsc_value_num(resolved_family));
            tsc_value_t boxed = tsc_value_object(entry);
            tsc_array_push_raw(addresses, &boxed);
        }
    }
}

tsc_str_t* tsc_dns_get_default_result_order(void) {
    return tsc_str_from_cstr(tsc_dns_default_result_order);
}

void tsc_dns_set_default_result_order(tsc_str_t* order) {
    if (!order) {
        tsc_throw_str(tsc_str_from_cstr("dns.setDefaultResultOrder: order required"));
        return;
    }
    if (tsc_str_eq(order, tsc_str_from_lit("verbatim", 8))) {
        tsc_dns_default_result_order = "verbatim";
        return;
    }
    if (tsc_str_eq(order, tsc_str_from_lit("ipv4first", 9))) {
        tsc_dns_default_result_order = "ipv4first";
        return;
    }
    if (tsc_str_eq(order, tsc_str_from_lit("ipv6first", 9))) {
        tsc_dns_default_result_order = "ipv6first";
        return;
    }
    tsc_throw_str(tsc_str_from_cstr("dns.setDefaultResultOrder: invalid order"));
}

tsc_dns_lookup_result_t tsc_dns_lookup(tsc_str_t* hostname, double family, double hints_value, double order_value) {
    tsc_dns_lookup_result_t out;
    out.error = NULL;
    out.address = NULL;
    out.family = 0.0;
    if (!hostname) {
        out.error = tsc_str_from_lit("dns.lookup: hostname required", 29);
        return out;
    }
    int ai_family = AF_UNSPEC;
    if (family == 4.0) {
        ai_family = AF_INET;
    } else if (family == 6.0) {
        ai_family = AF_INET6;
    } else if (family != 0.0) {
        out.error = tsc_str_from_lit("dns.lookup: unsupported family", 30);
        return out;
    }
    char* host = cstr_dup(hostname);
    struct addrinfo hints;
    memset(&hints, 0, sizeof(hints));
    hints.ai_family = ai_family;
    hints.ai_socktype = SOCK_STREAM;
    hints.ai_flags = tsc_dns_lookup_ai_flags(hints_value);
    struct addrinfo* result = NULL;
    int rc = getaddrinfo(host, NULL, &hints, &result);
    free(host);
    if (rc != 0) {
        out.error = tsc_str_from_cstr(gai_strerror(rc));
        return out;
    }
    const char* order = tsc_dns_effective_result_order(order_value);
    int passes[2] = { AF_UNSPEC, AF_UNSPEC };
    size_t pass_count = 1;
    if (strcmp(order, "ipv4first") == 0) {
        passes[0] = AF_INET;
        passes[1] = AF_INET6;
        pass_count = 2;
    } else if (strcmp(order, "ipv6first") == 0) {
        passes[0] = AF_INET6;
        passes[1] = AF_INET;
        pass_count = 2;
    }
    for (size_t pass = 0; pass < pass_count && !out.address; pass++) {
        for (struct addrinfo* cur = result; cur; cur = cur->ai_next) {
            if (passes[pass] != AF_UNSPEC && cur->ai_family != passes[pass]) continue;
            if (tsc_dns_addrinfo_entry(cur, &out.address, &out.family)) break;
        }
    }
    freeaddrinfo(result);
    if (!out.address) {
        out.error = tsc_str_from_lit("dns.lookup: no address found", 28);
    }
    return out;
}

tsc_dns_lookup_all_result_t tsc_dns_lookup_all(tsc_str_t* hostname, double family, double hints_value, double order_value) {
    tsc_dns_lookup_all_result_t out;
    out.error = NULL;
    out.addresses = NULL;
    if (!hostname) {
        out.error = tsc_str_from_lit("dns.lookup: hostname required", 29);
        return out;
    }
    int ai_family = AF_UNSPEC;
    if (family == 4.0) {
        ai_family = AF_INET;
    } else if (family == 6.0) {
        ai_family = AF_INET6;
    } else if (family != 0.0) {
        out.error = tsc_str_from_lit("dns.lookup: unsupported family", 30);
        return out;
    }
    char* host = cstr_dup(hostname);
    struct addrinfo hints;
    memset(&hints, 0, sizeof(hints));
    hints.ai_family = ai_family;
    hints.ai_socktype = SOCK_STREAM;
    hints.ai_flags = tsc_dns_lookup_ai_flags(hints_value);
    struct addrinfo* result = NULL;
    int rc = getaddrinfo(host, NULL, &hints, &result);
    free(host);
    if (rc != 0) {
        out.error = tsc_str_from_cstr(gai_strerror(rc));
        return out;
    }
    out.addresses = tsc_array_new(sizeof(tsc_value_t), 4);
    const char* order = tsc_dns_effective_result_order(order_value);
    if (strcmp(order, "ipv4first") == 0) {
        tsc_dns_lookup_all_append_family(out.addresses, result, AF_INET);
        tsc_dns_lookup_all_append_family(out.addresses, result, AF_INET6);
    } else if (strcmp(order, "ipv6first") == 0) {
        tsc_dns_lookup_all_append_family(out.addresses, result, AF_INET6);
        tsc_dns_lookup_all_append_family(out.addresses, result, AF_INET);
    } else {
        tsc_dns_lookup_all_append_family(out.addresses, result, AF_UNSPEC);
    }
    freeaddrinfo(result);
    if (out.addresses->len == 0) {
        out.error = tsc_str_from_lit("dns.lookup: no address found", 28);
    }
    return out;
}

tsc_dns_resolve4_result_t tsc_dns_resolve4(tsc_str_t* hostname) {
    tsc_dns_resolve4_result_t out;
    out.error = NULL;
    out.addresses = NULL;
    if (!hostname) {
        out.error = tsc_str_from_lit("dns.resolve4: hostname required", 31);
        return out;
    }
    char* host = cstr_dup(hostname);
    struct addrinfo hints;
    memset(&hints, 0, sizeof(hints));
    hints.ai_family = AF_INET;
    hints.ai_socktype = SOCK_STREAM;
    hints.ai_flags = 0;
    struct addrinfo* result = NULL;
    int rc = getaddrinfo(host, NULL, &hints, &result);
    free(host);
    if (rc != 0) {
        out.error = tsc_str_from_cstr(gai_strerror(rc));
        return out;
    }
    out.addresses = tsc_array_new(sizeof(tsc_str_t*), 4);
    char buf[INET6_ADDRSTRLEN];
    for (struct addrinfo* cur = result; cur; cur = cur->ai_next) {
        void* src = NULL;
        if (cur->ai_family == AF_INET) {
            src = &((struct sockaddr_in*)cur->ai_addr)->sin_addr;
        }
        if (src && inet_ntop(cur->ai_family, src, buf, sizeof(buf))) {
            tsc_str_t* s = tsc_str_from_cstr(buf);
            tsc_array_push_raw(out.addresses, &s);
        }
    }
    freeaddrinfo(result);
    if (out.addresses->len == 0) {
        out.error = tsc_str_from_lit("dns.resolve4: no address found", 30);
    }
    return out;
}

tsc_dns_resolve6_result_t tsc_dns_resolve6(tsc_str_t* hostname) {
    tsc_dns_resolve6_result_t out;
    out.error = NULL;
    out.addresses = NULL;
    if (!hostname) {
        out.error = tsc_str_from_lit("dns.resolve6: hostname required", 31);
        return out;
    }
    char* host = cstr_dup(hostname);
    struct addrinfo hints;
    memset(&hints, 0, sizeof(hints));
    hints.ai_family = AF_INET6;
    hints.ai_socktype = SOCK_STREAM;
    hints.ai_flags = 0;
    struct addrinfo* result = NULL;
    int rc = getaddrinfo(host, NULL, &hints, &result);
    free(host);
    if (rc != 0) {
        out.error = tsc_str_from_cstr(gai_strerror(rc));
        return out;
    }
    out.addresses = tsc_array_new(sizeof(tsc_str_t*), 4);
    char buf[INET6_ADDRSTRLEN];
    for (struct addrinfo* cur = result; cur; cur = cur->ai_next) {
        void* src = NULL;
        if (cur->ai_family == AF_INET6) {
            src = &((struct sockaddr_in6*)cur->ai_addr)->sin6_addr;
        }
        if (src && inet_ntop(cur->ai_family, src, buf, sizeof(buf))) {
            tsc_str_t* s = tsc_str_from_cstr(buf);
            tsc_array_push_raw(out.addresses, &s);
        }
    }
    freeaddrinfo(result);
    if (out.addresses->len == 0) {
        out.error = tsc_str_from_lit("dns.resolve6: no address found", 30);
    }
    return out;
}

tsc_dns_lookup_service_result_t tsc_dns_lookup_service(tsc_str_t* address, double port) {
    tsc_dns_lookup_service_result_t out;
    out.error = NULL;
    out.hostname = NULL;
    out.service = NULL;
    if (!address) {
        out.error = tsc_str_from_lit("dns.lookupService: address required", 35);
        return out;
    }
    int p = (int)port;
    if (p < 0 || p > 65535) {
        out.error = tsc_str_from_lit("dns.lookupService: invalid port", 31);
        return out;
    }
    char* ip_str = cstr_dup(address);
    struct in_addr in4_addr;
    struct in6_addr in6_addr;
    struct sockaddr* sa_ptr = NULL;
    socklen_t sa_len = 0;
    struct sockaddr_in sa4;
    struct sockaddr_in6 sa6;

    if (inet_pton(AF_INET, ip_str, &in4_addr) == 1) {
        memset(&sa4, 0, sizeof(sa4));
        sa4.sin_family = AF_INET;
        sa4.sin_port = htons((uint16_t)p);
        sa4.sin_addr = in4_addr;
        sa_ptr = (struct sockaddr*)&sa4;
        sa_len = sizeof(sa4);
    } else if (inet_pton(AF_INET6, ip_str, &in6_addr) == 1) {
        memset(&sa6, 0, sizeof(sa6));
        sa6.sin6_family = AF_INET6;
        sa6.sin6_port = htons((uint16_t)p);
        sa6.sin6_addr = in6_addr;
        sa_ptr = (struct sockaddr*)&sa6;
        sa_len = sizeof(sa6);
    }

    if (!sa_ptr) {
        free(ip_str);
        out.error = tsc_str_from_lit("dns.lookupService: invalid IP address", 37);
        return out;
    }

    char host[NI_MAXHOST];
    char serv[NI_MAXSERV];
    int rc = getnameinfo(sa_ptr, sa_len, host, sizeof(host), serv, sizeof(serv), 0);
    free(ip_str);

    if (rc != 0) {
        out.error = tsc_str_from_cstr(gai_strerror(rc));
        return out;
    }

    out.hostname = tsc_str_from_cstr(host);
    out.service = tsc_str_from_cstr(serv);
    return out;
}

bool tsc_net_is_ipv4(tsc_str_t* input) {
    if (!input) return false;
    char* cstr = cstr_dup(input);
    struct in_addr addr4;
    int ok = inet_pton(AF_INET, cstr, &addr4) == 1;
    free(cstr);
    return ok;
}

bool tsc_net_is_ipv6(tsc_str_t* input) {
    if (!input) return false;
    char* cstr = cstr_dup(input);
    struct in6_addr addr6;
    int ok = inet_pton(AF_INET6, cstr, &addr6) == 1;
    free(cstr);
    return ok;
}

double tsc_net_is_ip(tsc_str_t* input) {
    if (tsc_net_is_ipv4(input)) return 4.0;
    if (tsc_net_is_ipv6(input)) return 6.0;
    return 0.0;
}

tsc_value_t tsc_net_socket_address_new(tsc_value_t options) {
    tsc_object_t* obj = tsc_object_new();

    tsc_str_t* address = NULL;
    tsc_str_t* family = tsc_str_from_lit("ipv4", 4);
    double port = 0.0;
    double flowlabel = 0.0;

    if (!tsc_value_is_nullish(options)) {
        tsc_value_t fam_val = tsc_value_get_prop(options, tsc_str_from_lit("family", 6));
        if (!tsc_value_is_undefined(fam_val)) {
            tsc_str_t* f_str = tsc_value_to_string(fam_val);
            if (f_str && (strcmp(f_str->data, "ipv6") == 0 || strcmp(f_str->data, "IPv6") == 0 || strcmp(f_str->data, "IPV6") == 0)) {
                family = tsc_str_from_lit("ipv6", 4);
            } else {
                family = tsc_str_from_lit("ipv4", 4);
            }
        }

        tsc_value_t addr_val = tsc_value_get_prop(options, tsc_str_from_lit("address", 7));
        if (!tsc_value_is_undefined(addr_val)) {
            address = tsc_value_to_string(addr_val);
        }

        tsc_value_t port_val = tsc_value_get_prop(options, tsc_str_from_lit("port", 4));
        if (!tsc_value_is_undefined(port_val)) {
            port = tsc_value_as_num(port_val);
            if (isnan(port) || port < 0.0 || port > 65535.0) {
                tsc_throw_str(tsc_str_from_cstr("RangeError: Port should be >= 0 and < 65536"));
                return tsc_value_undefined();
            }
        }

        tsc_value_t flow_val = tsc_value_get_prop(options, tsc_str_from_lit("flowlabel", 9));
        if (!tsc_value_is_undefined(flow_val)) {
            flowlabel = tsc_value_as_num(flow_val);
            if (isnan(flowlabel) || flowlabel < 0.0 || flowlabel > 4294967295.0) {
                tsc_throw_str(tsc_str_from_cstr("RangeError: flowlabel should be >= 0 and < 4294967296"));
                return tsc_value_undefined();
            }
        }
    }

    if (!address) {
        if (strcmp(family->data, "ipv6") == 0) {
            address = tsc_str_from_lit("::", 2);
        } else {
            address = tsc_str_from_lit("127.0.0.1", 9);
        }
    }

    tsc_object_set(obj, tsc_str_from_lit("address", 7), tsc_value_string(address));
    tsc_object_set(obj, tsc_str_from_lit("family", 6), tsc_value_string(family));
    tsc_object_set(obj, tsc_str_from_lit("port", 4), tsc_value_num(port));
    tsc_object_set(obj, tsc_str_from_lit("flowlabel", 9), tsc_value_num(flowlabel));

    return tsc_value_object(obj);
}

tsc_value_t tsc_net_socket_address_parse(tsc_str_t* input) {
    if (!input || input->len == 0) {
        return tsc_value_undefined();
    }

    char* cstr = cstr_dup(input);
    int len = (int)input->len;

    char* address_buf = malloc(len + 1);
    int address_len = 0;
    double port = 0.0;
    tsc_str_t* family = NULL;

    bool parsed = false;

    if (cstr[0] == '[') {
        char* end_bracket = strchr(cstr, ']');
        if (end_bracket) {
            int ip_len = (int)(end_bracket - (cstr + 1));
            if (ip_len > 0) {
                memcpy(address_buf, cstr + 1, ip_len);
                address_buf[ip_len] = '\0';

                char* after = end_bracket + 1;
                if (*after == '\0') {
                    port = 0.0;
                    parsed = true;
                } else if (*after == ':') {
                    char* endptr;
                    double p = strtod(after + 1, &endptr);
                    if (endptr != after + 1 && *endptr == '\0' && p >= 0.0 && p <= 65535.0) {
                        port = p;
                        parsed = true;
                    }
                }
            }
        }

        if (parsed) {
            struct in6_addr addr6;
            if (inet_pton(AF_INET6, address_buf, &addr6) == 1) {
                family = tsc_str_from_lit("ipv6", 4);
                address_len = (int)strlen(address_buf);
            } else {
                parsed = false;
            }
        }
    } else {
        int colon_count = 0;
        char* p = cstr;
        while (*p) {
            if (*p == ':') colon_count++;
            p++;
        }

        if (colon_count >= 2) {
            strcpy(address_buf, cstr);
            struct in6_addr addr6;
            if (inet_pton(AF_INET6, address_buf, &addr6) == 1) {
                family = tsc_str_from_lit("ipv6", 4);
                port = 0.0;
                parsed = true;
            }
        } else if (colon_count == 1) {
            char* colon = strchr(cstr, ':');
            int ip_len = (int)(colon - cstr);
            if (ip_len > 0) {
                memcpy(address_buf, cstr, ip_len);
                address_buf[ip_len] = '\0';

                char* endptr;
                double p_val = strtod(colon + 1, &endptr);
                if (endptr != colon + 1 && *endptr == '\0' && p_val >= 0.0 && p_val <= 65535.0) {
                    struct in_addr addr4;
                    if (inet_pton(AF_INET, address_buf, &addr4) == 1) {
                        family = tsc_str_from_lit("ipv4", 4);
                        port = p_val;
                        parsed = true;
                    }
                }
            }
        } else {
            strcpy(address_buf, cstr);
            struct in_addr addr4;
            struct in6_addr addr6;
            if (inet_pton(AF_INET, address_buf, &addr4) == 1) {
                family = tsc_str_from_lit("ipv4", 4);
                port = 0.0;
                parsed = true;
            } else if (inet_pton(AF_INET6, address_buf, &addr6) == 1) {
                family = tsc_str_from_lit("ipv6", 4);
                port = 0.0;
                parsed = true;
            }
        }
    }

    free(cstr);

    if (!parsed) {
        free(address_buf);
        return tsc_value_undefined();
    }

    tsc_object_t* obj = tsc_object_new();
    tsc_object_set(obj, tsc_str_from_lit("address", 7), tsc_value_string(tsc_str_from_cstr(address_buf)));
    tsc_object_set(obj, tsc_str_from_lit("family", 6), tsc_value_string(family));
    tsc_object_set(obj, tsc_str_from_lit("port", 4), tsc_value_num(port));
    tsc_object_set(obj, tsc_str_from_lit("flowlabel", 9), tsc_value_num(0.0));

    free(address_buf);
    return tsc_value_object(obj);
}

double tsc_event_emitter_get_default_max_listeners(void) {
    return g_event_emitter_default_max_listeners;
}

void tsc_event_emitter_set_default_max_listeners(double n) {
    if (isnan(n) || n < 0.0) {
        tsc_throw_str(tsc_str_from_cstr("EventEmitter.defaultMaxListeners: invalid listener count"));
        return;
    }
    g_event_emitter_default_max_listeners = n;
}

void tsc_event_emitter_pause(tsc_event_emitter_t* ee) {
    if (ee) ee->paused = true;
}

void tsc_event_emitter_resume(tsc_event_emitter_t* ee) {
    if (ee) ee->paused = false;
}

bool tsc_event_emitter_is_paused(const tsc_event_emitter_t* ee) {
    return ee ? ee->paused : false;
}

bool tsc_event_emitter_emit(tsc_event_emitter_t* ee, const tsc_str_t* event, tsc_array_t* args) {
    if (!ee || !event) return false;
    bool called = false;
    for (size_t i = 0; i < ee->len; ) {
        tsc_event_listener_t listener = ee->listeners[i];
        if (!tsc_str_eq(listener.event, event)) {
            i++;
            continue;
        }
        called = true;
        if (listener.once) {
            for (size_t j = i + 1; j < ee->len; j++) ee->listeners[j - 1] = ee->listeners[j];
            ee->len--;
            listener.fn(listener.env, ee, args);
        } else {
            listener.fn(listener.env, ee, args);
            i++;
        }
    }
    if (!called && str_lit_eq(event, "error")) {
        tsc_str_t* message = tsc_str_from_cstr("Unhandled error event");
        if (args && args->len > 0) {
            message = tsc_value_to_string(TSC_ARR(tsc_value_t, args, 0));
        }
        tsc_throw_str(message);
    }
    return called;
}

double tsc_event_emitter_listener_count(const tsc_event_emitter_t* ee, const tsc_str_t* event) {
    if (!ee || !event) return 0.0;
    size_t count = 0;
    for (size_t i = 0; i < ee->len; i++) {
        if (tsc_str_eq(ee->listeners[i].event, event)) count++;
    }
    return (double)count;
}

double tsc_event_emitter_listener_count_identity(const tsc_event_emitter_t* ee, const tsc_str_t* event, void* identity) {
    if (!ee || !event || !identity) return 0.0;
    size_t count = 0;
    for (size_t i = 0; i < ee->len; i++) {
        if (tsc_str_eq(ee->listeners[i].event, event) && ee->listeners[i].identity == identity) count++;
    }
    return (double)count;
}

tsc_array_t* tsc_event_emitter_listeners(const tsc_event_emitter_t* ee, const tsc_str_t* event) {
    tsc_array_t* listeners = tsc_array_new(sizeof(tsc_value_t), ee ? ee->len : 0);
    if (!ee || !event) return listeners;
    for (size_t i = 0; i < ee->len; i++) {
        if (!tsc_str_eq(ee->listeners[i].event, event)) continue;
        tsc_value_t listener = value_event_listener_identity(ee->listeners[i].fn, ee->listeners[i].env, ee->listeners[i].identity);
        tsc_array_push_raw(listeners, &listener);
    }
    return listeners;
}

tsc_array_t* tsc_event_emitter_raw_listeners(const tsc_event_emitter_t* ee, const tsc_str_t* event) {
    tsc_array_t* listeners = tsc_array_new(sizeof(tsc_value_t), ee ? ee->len : 0);
    if (!ee || !event) return listeners;
    for (size_t i = 0; i < ee->len; i++) {
        if (!tsc_str_eq(ee->listeners[i].event, event)) continue;
        tsc_value_t listener = value_event_raw_listener_identity(ee->listeners[i].fn, ee->listeners[i].env, ee->listeners[i].identity, ee->listeners[i].order, ee->listeners[i].once);
        tsc_array_push_raw(listeners, &listener);
    }
    return listeners;
}

tsc_array_t* tsc_event_emitter_event_names(const tsc_event_emitter_t* ee) {
    tsc_array_t* names = tsc_array_new(sizeof(tsc_str_t*), ee ? ee->len : 0);
    if (!ee) return names;
    for (size_t i = 0; i < ee->len; i++) {
        bool seen = false;
        for (size_t j = 0; j < i; j++) {
            if (tsc_str_eq(ee->listeners[j].event, ee->listeners[i].event)) {
                seen = true;
                break;
            }
        }
        if (!seen) {
            tsc_str_t* event = ee->listeners[i].event;
            tsc_array_push_raw(names, &event);
        }
    }
    return names;
}

void tsc_event_emitter_set_max_listeners(tsc_event_emitter_t* ee, double n) {
    if (!ee) return;
    if (isnan(n) || n < 0.0) {
        tsc_throw_str(tsc_str_from_cstr("EventEmitter.setMaxListeners: invalid listener count"));
        return;
    }
    ee->max_listeners = n;
    ee->has_own_max_listeners = true;
}

double tsc_event_emitter_get_max_listeners(const tsc_event_emitter_t* ee) {
    return ee ? (ee->has_own_max_listeners ? ee->max_listeners : g_event_emitter_default_max_listeners) : 0.0;
}

tsc_event_t* tsc_event_new(tsc_str_t* type, bool cancelable) {
    tsc_event_t* event = (tsc_event_t*)TSC_GC_MALLOC(sizeof(tsc_event_t));
    event->type = type ? type : tsc_str_from_lit("", 0);
    event->target = NULL;
    event->current_target = NULL;
    event->default_prevented = false;
    event->cancelable = cancelable;
    return event;
}

tsc_str_t* tsc_event_type(const tsc_event_t* event) {
    return event && event->type ? event->type : tsc_str_from_lit("", 0);
}

tsc_event_target_t* tsc_event_target(const tsc_event_t* event) {
    return event ? event->target : NULL;
}

tsc_event_target_t* tsc_event_current_target(const tsc_event_t* event) {
    return event ? event->current_target : NULL;
}

bool tsc_event_default_prevented(const tsc_event_t* event) {
    return event ? event->default_prevented : false;
}

bool tsc_event_cancelable(const tsc_event_t* event) {
    return event ? event->cancelable : false;
}

void tsc_event_prevent_default(tsc_event_t* event) {
    if (event && event->cancelable) event->default_prevented = true;
}

tsc_event_target_t* tsc_event_target_new(void) {
    tsc_event_target_t* target = (tsc_event_target_t*)TSC_GC_MALLOC(sizeof(tsc_event_target_t));
    target->len = 0;
    target->cap = 0;
    target->listeners = NULL;
    return target;
}

void event_target_reserve(tsc_event_target_t* target, size_t cap) {
    if (!target || target->cap >= cap) return;
    size_t next = target->cap ? target->cap * 2 : 4;
    if (next < cap) next = cap;
    tsc_dom_event_listener_t* items = (tsc_dom_event_listener_t*)TSC_GC_MALLOC(sizeof(tsc_dom_event_listener_t) * next);
    if (target->listeners && target->len > 0) {
        memcpy(items, target->listeners, sizeof(tsc_dom_event_listener_t) * target->len);
    }
    target->listeners = items;
    target->cap = next;
}

void tsc_event_target_add(tsc_event_target_t* target, tsc_str_t* type, tsc_event_target_listener_fn_t fn, void* env, void* identity, bool once) {
    if (!target || !type || !fn) return;
    void* actual_identity = identity ? identity : env;
    for (size_t i = 0; i < target->len; i++) {
        if (tsc_str_eq(target->listeners[i].type, type) && target->listeners[i].fn == fn && target->listeners[i].identity == actual_identity) {
            return;
        }
    }
    event_target_reserve(target, target->len + 1);
    target->listeners[target->len++] = (tsc_dom_event_listener_t){ type, fn, env, actual_identity, once };
}

void tsc_event_target_remove(tsc_event_target_t* target, const tsc_str_t* type, tsc_event_target_listener_fn_t fn, void* identity) {
    if (!target || !type || !fn) return;
    for (size_t i = 0; i < target->len; i++) {
        if (!tsc_str_eq(target->listeners[i].type, type)) continue;
        if (target->listeners[i].fn != fn || target->listeners[i].identity != identity) continue;
        for (size_t j = i + 1; j < target->len; j++) target->listeners[j - 1] = target->listeners[j];
        target->len--;
        return;
    }
}

bool tsc_event_target_dispatch(tsc_event_target_t* target, tsc_event_t* event) {
    if (!target || !event) return true;
    if (!event->target) event->target = target;
    event->current_target = target;
    size_t snapshot_len = target->len;
    tsc_dom_event_listener_t* snapshot = NULL;
    if (snapshot_len > 0) {
        snapshot = (tsc_dom_event_listener_t*)TSC_GC_MALLOC(sizeof(tsc_dom_event_listener_t) * snapshot_len);
        memcpy(snapshot, target->listeners, sizeof(tsc_dom_event_listener_t) * snapshot_len);
    }
    for (size_t i = 0; i < snapshot_len; i++) {
        if (!tsc_str_eq(snapshot[i].type, event->type)) continue;
        bool still_registered = false;
        for (size_t j = 0; j < target->len; j++) {
            if (
                tsc_str_eq(target->listeners[j].type, snapshot[i].type) &&
                target->listeners[j].fn == snapshot[i].fn &&
                target->listeners[j].identity == snapshot[i].identity
            ) {
                still_registered = true;
                break;
            }
        }
        if (still_registered) {
            if (snapshot[i].once) {
                tsc_event_target_remove(target, snapshot[i].type, snapshot[i].fn, snapshot[i].identity);
            }
            snapshot[i].fn(snapshot[i].env, target, event);
        }
    }
    event->current_target = NULL;
    return !(event->cancelable && event->default_prevented);
}

tsc_value_t value_accessor_getter_identity(tsc_accessor_getter_t getter, void* env) {
    if (!getter) return tsc_value_undefined();
    if (getter == tsc_value_dynamic_accessor_getter && env) return *(tsc_value_t*)env;
    for (tsc_function_identity_t* cur = g_function_identities; cur; cur = cur->next) {
        if (cur->kind == TSC_FUNCTION_IDENTITY_GETTER && cur->code.getter == getter && cur->env == env) {
            return value_box(TSC_VALUE_TAG_FUNCTION, (uintptr_t)cur);
        }
    }
    tsc_function_identity_t* entry = (tsc_function_identity_t*)TSC_GC_MALLOC(sizeof(tsc_function_identity_t));
    entry->kind = TSC_FUNCTION_IDENTITY_GETTER;
    entry->extensible = true;
    entry->sealed = false;
    entry->frozen = false;
    entry->func_prototype_writable = true;
    entry->prototype = tsc_function_default_prototype();
    entry->func_prototype = tsc_value_undefined();
    tsc_function_init_metadata(entry, 0.0, tsc_str_from_lit("", 0));
    entry->code.getter = getter;
    entry->env = env;
    entry->next = g_function_identities;
    g_function_identities = entry;
    return value_box(TSC_VALUE_TAG_FUNCTION, (uintptr_t)entry);
}

tsc_value_t value_accessor_setter_identity(tsc_accessor_setter_t setter, void* env) {
    if (!setter) return tsc_value_undefined();
    if (setter == tsc_value_dynamic_accessor_setter && env) return *(tsc_value_t*)env;
    for (tsc_function_identity_t* cur = g_function_identities; cur; cur = cur->next) {
        if (cur->kind == TSC_FUNCTION_IDENTITY_SETTER && cur->code.setter == setter && cur->env == env) {
            return value_box(TSC_VALUE_TAG_FUNCTION, (uintptr_t)cur);
        }
    }
    tsc_function_identity_t* entry = (tsc_function_identity_t*)TSC_GC_MALLOC(sizeof(tsc_function_identity_t));
    entry->kind = TSC_FUNCTION_IDENTITY_SETTER;
    entry->extensible = true;
    entry->sealed = false;
    entry->frozen = false;
    entry->func_prototype_writable = true;
    entry->prototype = tsc_function_default_prototype();
    entry->func_prototype = tsc_value_undefined();
    tsc_function_init_metadata(entry, 1.0, tsc_str_from_lit("", 0));
    entry->code.setter = setter;
    entry->env = env;
    entry->next = g_function_identities;
    g_function_identities = entry;
    return value_box(TSC_VALUE_TAG_FUNCTION, (uintptr_t)entry);
}

double value_as_num(tsc_value_t v) {
    double n;
    memcpy(&n, &v, sizeof n);
    return n;
}

bool tsc_value_is_truthy(tsc_value_t v) {
    if (!value_is_box(v)) {
        double n = value_as_num(v);
        return n != 0.0 && !isnan(n);
    }
    switch (value_tag(v)) {
        case TSC_VALUE_TAG_UNDEFINED:
        case TSC_VALUE_TAG_NULL:
        case TSC_VALUE_TAG_FALSE:
            return false;
        case TSC_VALUE_TAG_STRING: {
            tsc_str_t* s = (tsc_str_t*)value_ptr(v);
            return s && s->len > 0;
        }
        default:
            return true;
    }
}

bool tsc_value_number_is_integer(tsc_value_t v) {
    if (value_is_box(v)) return false;
    double n = value_as_num(v);
    return !isnan(n) && !isinf(n) && n == floor(n);
}

bool tsc_value_number_is_finite(tsc_value_t v) {
    return !value_is_box(v) && isfinite(value_as_num(v));
}

bool tsc_value_number_is_nan(tsc_value_t v) {
    return !value_is_box(v) && isnan(value_as_num(v));
}

bool tsc_value_number_is_safe_integer(tsc_value_t v) {
    if (value_is_box(v)) return false;
    double n = value_as_num(v);
    return !isnan(n) && !isinf(n) && n == floor(n) && fabs(n) <= 9007199254740991.0;
}

double tsc_value_as_num(tsc_value_t v) {
    if (!value_is_box(v)) return value_as_num(v);
    if (value_tag(v) == TSC_VALUE_TAG_TRUE) return 1.0;
    if (value_tag(v) == TSC_VALUE_TAG_FALSE || value_tag(v) == TSC_VALUE_TAG_NULL) return 0.0;
    if (value_tag(v) == TSC_VALUE_TAG_STRING) {
        tsc_str_t* s = (tsc_str_t*)value_ptr(v);
        char* text = cstr_dup(s);
        char* p = text;
        while (isspace((unsigned char)*p)) p++;
        if (*p == '\0') {
            free(text);
            return 0.0;
        }
        char* end = NULL;
        double n = strtod(p, &end);
        while (end && isspace((unsigned char)*end)) end++;
        if (!end || end == p || *end != '\0') n = NAN;
        free(text);
        return n;
    }
    return NAN;
}

bool tsc_value_as_bool(tsc_value_t v) {
    if (value_is_box(v)) {
        if (value_tag(v) == TSC_VALUE_TAG_TRUE) return true;
        if (value_tag(v) == TSC_VALUE_TAG_FALSE) return false;
    }
    return tsc_value_is_truthy(v);
}

tsc_str_t* tsc_value_as_string(tsc_value_t v) {
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_STRING) {
        return (tsc_str_t*)value_ptr(v);
    }
    return tsc_value_to_string(v);
}

tsc_array_t* tsc_value_as_array(tsc_value_t v) {
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_ARRAY) {
        return (tsc_array_t*)value_ptr(v);
    }
    return tsc_array_new(sizeof(tsc_value_t), 1);
}

tsc_map_t* tsc_value_as_map(tsc_value_t v) {
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        tsc_object_t* object = (tsc_object_t*)value_ptr(v);
        if (object && object->is_map) return (tsc_map_t*)object->class_ptr;
    }
    tsc_throw_str(tsc_str_from_cstr("value is not a Map"));
    return NULL;
}

tsc_set_t* tsc_value_as_set(tsc_value_t v) {
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        tsc_object_t* object = (tsc_object_t*)value_ptr(v);
        if (object && object->is_set) return (tsc_set_t*)object->class_ptr;
    }
    tsc_throw_str(tsc_str_from_cstr("value is not a Set"));
    return NULL;
}

tsc_date_t* tsc_value_as_date(tsc_value_t v) {
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        tsc_object_t* object = (tsc_object_t*)value_ptr(v);
        if (object && object->is_date) return (tsc_date_t*)object->class_ptr;
    }
    tsc_throw_str(tsc_str_from_cstr("value is not a Date"));
    return NULL;
}

tsc_regexp_t* tsc_value_as_regexp(tsc_value_t v) {
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        tsc_object_t* object = (tsc_object_t*)value_ptr(v);
        if (object && object->is_regexp) return (tsc_regexp_t*)object->class_ptr;
    }
    tsc_throw_str(tsc_str_from_cstr("value is not a RegExp"));
    return NULL;
}

tsc_error_t* tsc_value_as_error(tsc_value_t v) {
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        tsc_object_t* object = (tsc_object_t*)value_ptr(v);
        if (object && object->is_error) return (tsc_error_t*)object->class_ptr;
    }
    tsc_throw_str(tsc_str_from_cstr("value is not an Error"));
    return NULL;
}

tsc_buffer_t* tsc_value_as_buffer(tsc_value_t v) {
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        tsc_object_t* object = (tsc_object_t*)value_ptr(v);
        if (object && object->is_typed_array) return (tsc_buffer_t*)object->class_ptr;
    }
    tsc_throw_str(tsc_str_from_cstr("value is not a Buffer"));
    return NULL;
}

tsc_url_t* tsc_value_as_url(tsc_value_t v) {
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        tsc_object_t* object = (tsc_object_t*)value_ptr(v);
        if (object && object->is_url) return (tsc_url_t*)object->class_ptr;
    }
    tsc_throw_str(tsc_str_from_cstr("value is not a URL"));
    return NULL;
}

tsc_url_search_params_t* tsc_value_as_url_search_params(tsc_value_t v) {
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        tsc_object_t* object = (tsc_object_t*)value_ptr(v);
        if (object && object->is_url_search_params) {
            return (tsc_url_search_params_t*)object->class_ptr;
        }
    }
    tsc_throw_str(tsc_str_from_cstr("value is not a URLSearchParams"));
    return NULL;
}

tsc_array_buffer_t* tsc_value_as_array_buffer(tsc_value_t v) {
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        tsc_object_t* object = (tsc_object_t*)value_ptr(v);
        if (object && object->is_array_buffer) return (tsc_array_buffer_t*)object->class_ptr;
    }
    tsc_throw_str(tsc_str_from_cstr("value is not an ArrayBuffer"));
    return NULL;
}

tsc_data_view_t* tsc_value_as_data_view(tsc_value_t v) {
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        tsc_object_t* object = (tsc_object_t*)value_ptr(v);
        if (object && object->is_data_view) return (tsc_data_view_t*)object->class_ptr;
    }
    tsc_throw_str(tsc_str_from_cstr("value is not a DataView"));
    return NULL;
}

tsc_text_encoder_t* tsc_value_as_text_encoder(tsc_value_t v) {
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        tsc_object_t* object = (tsc_object_t*)value_ptr(v);
        if (object && object->is_text_encoder) return (tsc_text_encoder_t*)object->class_ptr;
    }
    tsc_throw_str(tsc_str_from_cstr("value is not a TextEncoder"));
    return NULL;
}

tsc_text_decoder_t* tsc_value_as_text_decoder(tsc_value_t v) {
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        tsc_object_t* object = (tsc_object_t*)value_ptr(v);
        if (object && object->is_text_decoder) return (tsc_text_decoder_t*)object->class_ptr;
    }
    tsc_throw_str(tsc_str_from_cstr("value is not a TextDecoder"));
    return NULL;
}

tsc_str_t* tsc_value_typeof(tsc_value_t v) {
    if (!value_is_box(v)) return tsc_str_from_lit("number", 6);
    switch (value_tag(v)) {
        case TSC_VALUE_TAG_FUNCTION: return tsc_str_from_lit("function", 8);
        case TSC_VALUE_TAG_UNDEFINED: return tsc_str_from_lit("undefined", 9);
        case TSC_VALUE_TAG_NULL: return tsc_str_from_lit("object", 6);
        case TSC_VALUE_TAG_FALSE:
        case TSC_VALUE_TAG_TRUE: return tsc_str_from_lit("boolean", 7);
        case TSC_VALUE_TAG_STRING: return tsc_str_from_lit("string", 6);
        case TSC_VALUE_TAG_ARRAY:
            return tsc_str_from_lit("object", 6);
        case TSC_VALUE_TAG_OBJECT: {
            if (tsc_proxy_trap_is_callable(v)) {
                return tsc_str_from_lit("function", 8);
            }
            return tsc_str_from_lit("object", 6);
        }
    }
    return tsc_str_from_lit("undefined", 9);
}

tsc_str_t* tsc_value_to_string(tsc_value_t v) {
    if (!value_is_box(v)) return tsc_str_from_num(value_as_num(v));
    switch (value_tag(v)) {
        case TSC_VALUE_TAG_FUNCTION: return tsc_str_from_lit("[function]", 10);
        case TSC_VALUE_TAG_UNDEFINED: return tsc_str_from_lit("undefined", 9);
        case TSC_VALUE_TAG_NULL: return tsc_str_from_lit("null", 4);
        case TSC_VALUE_TAG_FALSE: return tsc_str_from_lit("false", 5);
        case TSC_VALUE_TAG_TRUE: return tsc_str_from_lit("true", 4);
        case TSC_VALUE_TAG_STRING: return (tsc_str_t*)value_ptr(v);
        case TSC_VALUE_TAG_ARRAY: {
            tsc_value_t joined = tsc_value_method_join(v, tsc_value_undefined());
            return tsc_value_as_string(joined);
        }
        case TSC_VALUE_TAG_OBJECT: {
            tsc_object_t* o = (tsc_object_t*)value_ptr(v);
            if (o && o->is_proxy && tsc_proxy_chain_has_revoked(v)) {
                tsc_throw_str(tsc_str_from_cstr("Cannot perform 'get' on a proxy that has been revoked"));
            }
            if (tsc_proxy_trap_is_callable(v)) {
                return tsc_str_from_lit("[function]", 10);
            }
            if (o && o->is_typed_array) {
                return tsc_buffer_to_string((const tsc_buffer_t*)o->class_ptr, tsc_str_from_lit("utf8", 4));
            }
            return tsc_str_from_lit("[object Object]", 15);
        }
    }
    return tsc_str_from_lit("undefined", 9);
}

/* ---------------- console ---------------- */

void console_write_str(FILE* f, const tsc_str_t* s) {
    if (s && s->len > 0) fwrite(s->data, 1, s->len, f);
}

void console_write(FILE* f, size_t n, va_list ap) {
    if (n == 0) {
        fputc('\n', f);
        return;
    }
    tsc_str_t** args = (tsc_str_t**)calloc(n, sizeof(tsc_str_t*));
    for (size_t i = 0; i < n; i++) args[i] = va_arg(ap, tsc_str_t*);

    const tsc_str_t* fmt = args[0];
    size_t next = 1;
    if (fmt) {
        for (size_t i = 0; i < fmt->len; i++) {
            char ch = fmt->data[i];
            if (ch != '%' || i + 1 >= fmt->len) {
                fputc(ch, f);
                continue;
            }
            char spec = fmt->data[++i];
            if (spec == '%') {
                fputc('%', f);
            } else if (
                spec == 's' || spec == 'd' || spec == 'i' ||
                spec == 'f' || spec == 'o' || spec == 'O'
            ) {
                if (next < n) {
                    console_write_str(f, args[next++]);
                } else {
                    fputc('%', f);
                    fputc(spec, f);
                }
            } else if (spec == 'c') {
                if (next < n) next++;
            } else {
                fputc('%', f);
                fputc(spec, f);
            }
        }
    }
    for (size_t i = next; i < n; i++) {
        fputc(' ', f);
        console_write_str(f, args[i]);
    }
    free(args);
    fputc('\n', f);
}

void tsc_console_log_n(size_t n, ...) {
    va_list ap; va_start(ap, n);
    console_write(stdout, n, ap);
    va_end(ap);
}

void tsc_console_error_n(size_t n, ...) {
    va_list ap; va_start(ap, n);
    console_write(stderr, n, ap);
    va_end(ap);
}

tsc_str_t* tsc_util_format_n(size_t n, ...) {
    if (n == 0) {
        return tsc_str_from_lit("", 0);
    }

    tsc_value_t* args = (tsc_value_t*)calloc(n, sizeof(tsc_value_t));
    va_list ap;
    va_start(ap, n);
    for (size_t i = 0; i < n; i++) {
        args[i] = va_arg(ap, tsc_value_t);
    }
    va_end(ap);

    tsc_jsonbuf_t b;
    tsc_jsonbuf_init(&b);

    bool is_fmt_str = value_is_box(args[0]) && value_tag(args[0]) == TSC_VALUE_TAG_STRING;
    size_t next = 1;
    if (is_fmt_str) {
        const tsc_str_t* fmt = (const tsc_str_t*)value_ptr(args[0]);
        for (size_t i = 0; i < fmt->len; i++) {
            char ch = fmt->data[i];
            if (ch != '%' || i + 1 >= fmt->len) {
                tsc_jsonbuf_byte(&b, ch);
                continue;
            }
            char spec = fmt->data[++i];
            if (spec == '%') {
                tsc_jsonbuf_byte(&b, '%');
            } else if (spec == 's') {
                if (next < n) {
                    tsc_str_t* s = tsc_value_to_string(args[next++]);
                    tsc_jsonbuf_append(&b, s->data, s->len);
                } else {
                    tsc_jsonbuf_append(&b, "%s", 2);
                }
            } else if (spec == 'd' || spec == 'i') {
                if (next < n) {
                    double num = tsc_value_as_num(args[next++]);
                    if (isnan(num)) {
                        tsc_jsonbuf_append(&b, "NaN", 3);
                    } else {
                        tsc_jsonbuf_int(&b, (int64_t)num);
                    }
                } else {
                    tsc_jsonbuf_byte(&b, '%');
                    tsc_jsonbuf_byte(&b, spec);
                }
            } else if (spec == 'f') {
                if (next < n) {
                    double num = tsc_value_as_num(args[next++]);
                    if (isnan(num)) {
                        tsc_jsonbuf_append(&b, "NaN", 3);
                    } else {
                        tsc_str_t* s = tsc_str_from_num(num);
                        tsc_jsonbuf_append(&b, s->data, s->len);
                    }
                } else {
                    tsc_jsonbuf_append(&b, "%f", 2);
                }
            } else if (spec == 'j') {
                if (next < n) {
                    tsc_value_t val = args[next++];
                    if (value_is_box(val) && value_tag(val) == TSC_VALUE_TAG_UNDEFINED) {
                        tsc_jsonbuf_append(&b, "undefined", 9);
                    } else {
                        tsc_str_t* s = tsc_value_json_stringify(val);
                        tsc_jsonbuf_append(&b, s->data, s->len);
                    }
                } else {
                    tsc_jsonbuf_append(&b, "%j", 2);
                }
            } else {
                tsc_jsonbuf_byte(&b, '%');
                tsc_jsonbuf_byte(&b, spec);
            }
        }
    } else {
        next = 0;
    }

    for (size_t i = next; i < n; i++) {
        if (is_fmt_str || i > 0) {
            tsc_jsonbuf_byte(&b, ' ');
        }
        tsc_str_t* s = tsc_value_to_string(args[i]);
        tsc_jsonbuf_append(&b, s->data, s->len);
    }

    free(args);
    return tsc_jsonbuf_finish(&b);
}

bool tsc_instanceof(const char* type_chain, const char* class_name) {
    if (!type_chain || !class_name) return false;
    size_t n = strlen(class_name);
    for (const char* p = type_chain; (p = strstr(p, class_name)) != NULL; p += n) {
        if ((p == type_chain || p[-1] == '|') && p[n] == '|') return true;
    }
    return false;
}

/* ---------------- fs (sync) ---------------- */

char* cstr_dup(const tsc_str_t* s) {
    char* c = (char*)malloc(s->len + 1);
    memcpy(c, s->data, s->len);
    c[s->len] = '\0';
    return c;
}

#ifdef TSC_HAS_LIBUV
/* The build image provides libuv's SONAME but not its development headers.
 * These declarations cover only the stable fs request calls used here. The
 * opaque request storage is deliberately oversized and correctly aligned so
 * libuv can use its public uv_fs_t layout without a distro-specific header. */
typedef struct {
    max_align_t alignment;
    unsigned char opaque[1024];
} tsc_uv_fs_t;
typedef struct uv_loop_s uv_loop_t;
typedef struct {
    char* base;
    size_t len;
} tsc_uv_buf_t;
typedef struct {
    const char* name;
    int type;
} tsc_uv_dirent_t;
typedef struct {
    long tv_sec;
    long tv_nsec;
} tsc_uv_timespec_t;
typedef struct {
    uint64_t st_dev;
    uint64_t st_mode;
    uint64_t st_nlink;
    uint64_t st_uid;
    uint64_t st_gid;
    uint64_t st_rdev;
    uint64_t st_ino;
    uint64_t st_size;
    uint64_t st_blksize;
    uint64_t st_blocks;
    uint64_t st_flags;
    uint64_t st_gen;
    tsc_uv_timespec_t st_atim;
    tsc_uv_timespec_t st_mtim;
    tsc_uv_timespec_t st_ctim;
    tsc_uv_timespec_t st_birthtim;
} tsc_uv_stat_t;
typedef struct {
    uint64_t f_type;
    uint64_t f_bsize;
    uint64_t f_blocks;
    uint64_t f_bfree;
    uint64_t f_bavail;
    uint64_t f_files;
    uint64_t f_ffree;
    uint64_t f_spare[4];
} tsc_uv_statfs_t;
typedef void (*tsc_uv_fs_cb)(tsc_uv_fs_t* req);

extern uv_loop_t* uv_default_loop(void);
extern int uv_run(uv_loop_t* loop, int mode);
extern int uv_fs_open(uv_loop_t* loop, tsc_uv_fs_t* req, const char* path, int flags, int mode, tsc_uv_fs_cb cb);
extern int uv_fs_read(uv_loop_t* loop, tsc_uv_fs_t* req, int file, const tsc_uv_buf_t bufs[], unsigned int nbufs, int64_t offset, tsc_uv_fs_cb cb);
extern int uv_fs_write(uv_loop_t* loop, tsc_uv_fs_t* req, int file, const tsc_uv_buf_t bufs[], unsigned int nbufs, int64_t offset, tsc_uv_fs_cb cb);
extern int uv_fs_scandir(uv_loop_t* loop, tsc_uv_fs_t* req, const char* path, int flags, tsc_uv_fs_cb cb);
extern int uv_fs_scandir_next(const tsc_uv_fs_t* req, tsc_uv_dirent_t* ent);
extern int uv_fs_access(uv_loop_t* loop, tsc_uv_fs_t* req, const char* path, int mode, tsc_uv_fs_cb cb);
extern int uv_fs_stat(uv_loop_t* loop, tsc_uv_fs_t* req, const char* path, tsc_uv_fs_cb cb);
extern int uv_fs_lstat(uv_loop_t* loop, tsc_uv_fs_t* req, const char* path, tsc_uv_fs_cb cb);
extern tsc_uv_stat_t* uv_fs_get_statbuf(tsc_uv_fs_t* req);
extern int uv_fs_statfs(uv_loop_t* loop, tsc_uv_fs_t* req, const char* path, tsc_uv_fs_cb cb);
extern void* uv_fs_get_ptr(const tsc_uv_fs_t* req);
extern const char* uv_fs_get_path(const tsc_uv_fs_t* req);
extern int uv_fs_copyfile(uv_loop_t* loop, tsc_uv_fs_t* req, const char* path, const char* new_path, int flags, tsc_uv_fs_cb cb);
extern int uv_fs_rename(uv_loop_t* loop, tsc_uv_fs_t* req, const char* path, const char* new_path, tsc_uv_fs_cb cb);
extern int uv_fs_symlink(uv_loop_t* loop, tsc_uv_fs_t* req, const char* path, const char* new_path, int flags, tsc_uv_fs_cb cb);
extern int uv_fs_link(uv_loop_t* loop, tsc_uv_fs_t* req, const char* path, const char* new_path, tsc_uv_fs_cb cb);
extern int uv_fs_utime(uv_loop_t* loop, tsc_uv_fs_t* req, const char* path, double atime, double mtime, tsc_uv_fs_cb cb);
extern int uv_fs_lutime(uv_loop_t* loop, tsc_uv_fs_t* req, const char* path, double atime, double mtime, tsc_uv_fs_cb cb);
extern int uv_fs_readlink(uv_loop_t* loop, tsc_uv_fs_t* req, const char* path, tsc_uv_fs_cb cb);
extern int uv_fs_realpath(uv_loop_t* loop, tsc_uv_fs_t* req, const char* path, tsc_uv_fs_cb cb);
extern int uv_fs_mkdtemp(uv_loop_t* loop, tsc_uv_fs_t* req, const char* tpl, tsc_uv_fs_cb cb);
extern int uv_fs_close(uv_loop_t* loop, tsc_uv_fs_t* req, int file, tsc_uv_fs_cb cb);
extern void uv_fs_req_cleanup(tsc_uv_fs_t* req);
extern ssize_t uv_fs_get_result(const tsc_uv_fs_t* req);

#define TSC_UV_RUN_ONCE 1
#define TSC_UV_RUN_NOWAIT 2
#define TSC_UV_READ_CHUNK ((size_t)65536)
#define TSC_UV_FS_COPYFILE_EXCL 0x0001

typedef struct tsc_fs_read_file_async {
    tsc_uv_fs_t req;
    tsc_promise_t* promise;
    char* path;
    int fd;
    uint8_t* bytes;
    size_t len;
    size_t cap;
    tsc_uv_buf_t read_buf;
    bool want_buffer;
    tsc_str_t* error;
    struct tsc_fs_read_file_async* next;
} tsc_fs_read_file_async_t;

static tsc_fs_read_file_async_t* g_tsc_fs_read_file_async = NULL;
static uv_loop_t* g_tsc_fs_uv_loop = NULL;
static void tsc_fs_stats_fill_uv(tsc_fs_stats_t* out, const tsc_uv_stat_t* st);
static tsc_fs_stats_t* tsc_fs_stats_new(void);

static void tsc_fs_read_file_async_remove(tsc_fs_read_file_async_t* task) {
    tsc_fs_read_file_async_t** cursor = &g_tsc_fs_read_file_async;
    while (*cursor) {
        if (*cursor == task) {
            *cursor = task->next;
            task->next = NULL;
            return;
        }
        cursor = &(*cursor)->next;
    }
}

static void tsc_fs_read_file_async_finish(tsc_fs_read_file_async_t* task, bool success) {
    if (success) {
        if (task->want_buffer) {
            tsc_buffer_t* out = tsc_buffer_alloc((double)task->len, 0.0);
            if (task->len > 0) memcpy(out->data, task->bytes, task->len);
            tsc_promise_fulfill_in_place_ptr(task->promise, out);
        } else {
            tsc_str_t* out = str_alloc(task->len);
            if (task->len > 0) memcpy((char*)out->data, task->bytes, task->len);
            ((char*)out->data)[task->len] = '\0';
            out->len = task->len;
            tsc_promise_fulfill_in_place(task->promise, tsc_value_string(out));
        }
    } else {
        tsc_promise_reject_in_place(
            task->promise,
            tsc_value_string(task->error ? task->error : tsc_str_from_cstr("fs.readFileSync: could not read file"))
        );
    }
    free(task->path);
    tsc_fs_read_file_async_remove(task);
}

static void tsc_fs_read_file_async_close_cb(tsc_uv_fs_t* req);

static void tsc_fs_read_file_async_close_or_finish(tsc_fs_read_file_async_t* task, bool success) {
    int rc = uv_fs_close(g_tsc_fs_uv_loop, &task->req, task->fd, tsc_fs_read_file_async_close_cb);
    if (rc < 0) {
        uv_fs_req_cleanup(&task->req);
        if (success) task->error = tsc_str_from_cstr("fs.readFileSync: could not close file");
        tsc_fs_read_file_async_finish(task, false);
    }
}

static void tsc_fs_read_file_async_close_cb(tsc_uv_fs_t* req) {
    tsc_fs_read_file_async_t* task = (tsc_fs_read_file_async_t*)req;
    ssize_t result = uv_fs_get_result(req);
    uv_fs_req_cleanup(req);
    if (result < 0) {
        task->error = tsc_str_from_cstr("fs.readFileSync: could not close file");
        tsc_fs_read_file_async_finish(task, false);
        return;
    }
    tsc_fs_read_file_async_finish(task, task->error == NULL);
}

static void tsc_fs_read_file_async_read_cb(tsc_uv_fs_t* req);

static void tsc_fs_read_file_async_read_next(tsc_fs_read_file_async_t* task) {
    if (task->cap - task->len < TSC_UV_READ_CHUNK) {
        size_t next_cap = task->cap == 0 ? TSC_UV_READ_CHUNK : task->cap * 2;
        if (next_cap < task->len + TSC_UV_READ_CHUNK) next_cap = task->len + TSC_UV_READ_CHUNK;
        task->bytes = (uint8_t*)TSC_GC_REALLOC(task->bytes, next_cap);
        task->cap = next_cap;
    }
    task->read_buf.base = (char*)task->bytes + task->len;
    task->read_buf.len = task->cap - task->len;
    int rc = uv_fs_read(
        g_tsc_fs_uv_loop,
        &task->req,
        task->fd,
        &task->read_buf,
        1,
        (int64_t)task->len,
        tsc_fs_read_file_async_read_cb
    );
    if (rc < 0) {
        uv_fs_req_cleanup(&task->req);
        task->error = tsc_str_from_cstr("fs.readFileSync: could not read file");
        tsc_fs_read_file_async_close_or_finish(task, false);
    }
}

static void tsc_fs_read_file_async_read_cb(tsc_uv_fs_t* req) {
    tsc_fs_read_file_async_t* task = (tsc_fs_read_file_async_t*)req;
    ssize_t result = uv_fs_get_result(req);
    uv_fs_req_cleanup(req);
    if (result < 0) {
        task->error = tsc_str_from_cstr("fs.readFileSync: could not read file");
        tsc_fs_read_file_async_close_or_finish(task, false);
        return;
    }
    if (result == 0) {
        tsc_fs_read_file_async_close_or_finish(task, true);
        return;
    }
    task->len += (size_t)result;
    tsc_fs_read_file_async_read_next(task);
}

static void tsc_fs_read_file_async_open_cb(tsc_uv_fs_t* req) {
    tsc_fs_read_file_async_t* task = (tsc_fs_read_file_async_t*)req;
    ssize_t result = uv_fs_get_result(req);
    uv_fs_req_cleanup(req);
    if (result < 0) {
        task->error = tsc_str_from_cstr("fs.readFileSync: could not open file");
        tsc_fs_read_file_async_finish(task, false);
        return;
    }
    task->fd = (int)result;
    tsc_fs_read_file_async_read_next(task);
}

tsc_promise_t* tsc_fs_promises_read_file_async(const tsc_str_t* path, bool want_buffer) {
    tsc_promise_t* promise = tsc_promise_pending();
    tsc_fs_read_file_async_t* task = (tsc_fs_read_file_async_t*)TSC_GC_MALLOC(sizeof(tsc_fs_read_file_async_t));
    memset(task, 0, sizeof(*task));
    task->promise = promise;
    task->path = cstr_dup(path);
    task->fd = -1;
    task->want_buffer = want_buffer;
    task->next = g_tsc_fs_read_file_async;
    g_tsc_fs_read_file_async = task;
    g_tsc_fs_uv_loop = uv_default_loop();
    int rc = uv_fs_open(g_tsc_fs_uv_loop, &task->req, task->path, O_RDONLY, 0, tsc_fs_read_file_async_open_cb);
    if (rc < 0) {
        uv_fs_req_cleanup(&task->req);
        task->error = tsc_str_from_cstr("fs.readFileSync: could not open file");
        tsc_fs_read_file_async_finish(task, false);
    }
    return promise;
}

typedef struct tsc_fs_write_file_async {
    tsc_uv_fs_t req;
    tsc_promise_t* promise;
    char* path;
    int fd;
    const tsc_str_t* string_data;
    const tsc_buffer_t* buffer_data;
    const uint8_t* bytes;
    size_t len;
    size_t offset;
    tsc_uv_buf_t write_buf;
    bool append;
    bool exclusive;
    bool update;
    double file_mode;
    tsc_str_t* error;
    struct tsc_fs_write_file_async* next;
} tsc_fs_write_file_async_t;

static tsc_fs_write_file_async_t* g_tsc_fs_write_file_async = NULL;

static void tsc_fs_write_file_async_remove(tsc_fs_write_file_async_t* task) {
    tsc_fs_write_file_async_t** cursor = &g_tsc_fs_write_file_async;
    while (*cursor) {
        if (*cursor == task) {
            *cursor = task->next;
            task->next = NULL;
            return;
        }
        cursor = &(*cursor)->next;
    }
}

static void tsc_fs_write_file_async_finish(tsc_fs_write_file_async_t* task, bool success) {
    if (success) {
        tsc_promise_fulfill_in_place(task->promise, tsc_value_undefined());
    } else {
        tsc_promise_reject_in_place(
            task->promise,
            tsc_value_string(task->error ? task->error : tsc_str_from_cstr("fs.writeFileSync: could not write file"))
        );
    }
    free(task->path);
    tsc_fs_write_file_async_remove(task);
}

static void tsc_fs_write_file_async_close_cb(tsc_uv_fs_t* req);

static void tsc_fs_write_file_async_close_or_finish(tsc_fs_write_file_async_t* task, bool success) {
    int rc = uv_fs_close(g_tsc_fs_uv_loop, &task->req, task->fd, tsc_fs_write_file_async_close_cb);
    if (rc < 0) {
        uv_fs_req_cleanup(&task->req);
        if (success) task->error = tsc_str_from_cstr("fs.writeFileSync: could not close file");
        tsc_fs_write_file_async_finish(task, false);
    }
}

static void tsc_fs_write_file_async_close_cb(tsc_uv_fs_t* req) {
    tsc_fs_write_file_async_t* task = (tsc_fs_write_file_async_t*)req;
    ssize_t result = uv_fs_get_result(req);
    uv_fs_req_cleanup(req);
    if (result < 0) {
        task->error = tsc_str_from_cstr("fs.writeFileSync: could not close file");
        tsc_fs_write_file_async_finish(task, false);
        return;
    }
    tsc_fs_write_file_async_finish(task, task->error == NULL);
}

static void tsc_fs_write_file_async_write_cb(tsc_uv_fs_t* req);

static void tsc_fs_write_file_async_write_next(tsc_fs_write_file_async_t* task) {
    if (task->offset == task->len) {
        tsc_fs_write_file_async_close_or_finish(task, true);
        return;
    }
    task->write_buf.base = (char*)task->bytes + task->offset;
    task->write_buf.len = task->len - task->offset;
    int rc = uv_fs_write(
        g_tsc_fs_uv_loop,
        &task->req,
        task->fd,
        &task->write_buf,
        1,
        task->append ? -1 : (int64_t)task->offset,
        tsc_fs_write_file_async_write_cb
    );
    if (rc < 0) {
        uv_fs_req_cleanup(&task->req);
        task->error = tsc_str_from_cstr("fs.writeFileSync: could not write file");
        tsc_fs_write_file_async_close_or_finish(task, false);
    }
}

static void tsc_fs_write_file_async_write_cb(tsc_uv_fs_t* req) {
    tsc_fs_write_file_async_t* task = (tsc_fs_write_file_async_t*)req;
    ssize_t result = uv_fs_get_result(req);
    uv_fs_req_cleanup(req);
    if (result < 0) {
        task->error = tsc_str_from_cstr("fs.writeFileSync: could not write file");
        tsc_fs_write_file_async_close_or_finish(task, false);
        return;
    }
    if (result == 0) {
        task->error = tsc_str_from_cstr("fs.writeFileSync: could not write file");
        tsc_fs_write_file_async_close_or_finish(task, false);
        return;
    }
    task->offset += (size_t)result;
    tsc_fs_write_file_async_write_next(task);
}

static void tsc_fs_write_file_async_open_cb(tsc_uv_fs_t* req) {
    tsc_fs_write_file_async_t* task = (tsc_fs_write_file_async_t*)req;
    ssize_t result = uv_fs_get_result(req);
    uv_fs_req_cleanup(req);
    if (result < 0) {
        if (task->exclusive && access(task->path, F_OK) == 0) {
            task->error = tsc_str_from_cstr("fs.writeFileSync: file already exists");
        } else {
            task->error = tsc_str_from_cstr("fs.writeFileSync: could not open");
        }
        tsc_fs_write_file_async_finish(task, false);
        return;
    }
    task->fd = (int)result;
    tsc_fs_write_file_async_write_next(task);
}

static tsc_promise_t* tsc_fs_promises_write_file_async(
    const tsc_str_t* path,
    const uint8_t* bytes,
    size_t len,
    const tsc_str_t* string_data,
    const tsc_buffer_t* buffer_data,
    bool append,
    bool exclusive,
    bool update,
    double file_mode
) {
    tsc_promise_t* promise = tsc_promise_pending();
    tsc_fs_write_file_async_t* task = (tsc_fs_write_file_async_t*)TSC_GC_MALLOC(sizeof(tsc_fs_write_file_async_t));
    memset(task, 0, sizeof(*task));
    task->promise = promise;
    task->path = cstr_dup(path);
    task->fd = -1;
    task->string_data = string_data;
    task->buffer_data = buffer_data;
    task->bytes = bytes;
    task->len = len;
    task->append = append;
    task->exclusive = exclusive;
    task->update = update;
    task->file_mode = file_mode;
    task->next = g_tsc_fs_write_file_async;
    g_tsc_fs_write_file_async = task;
    g_tsc_fs_uv_loop = uv_default_loop();

    int flags = update ? O_RDWR : O_WRONLY;
    if (!update) flags |= O_CREAT;
    if (!append && !update) flags |= O_TRUNC;
    if (append) flags |= O_APPEND;
    if (exclusive) flags |= O_EXCL;
    mode_t mode = (isnan(file_mode) || isinf(file_mode) || file_mode < 0.0)
        ? (mode_t)0666
        : (mode_t)file_mode;
    int rc = uv_fs_open(g_tsc_fs_uv_loop, &task->req, task->path, flags, mode, tsc_fs_write_file_async_open_cb);
    if (rc < 0) {
        uv_fs_req_cleanup(&task->req);
        task->error = tsc_str_from_cstr("fs.writeFileSync: could not open");
        tsc_fs_write_file_async_finish(task, false);
    }
    return promise;
}

tsc_promise_t* tsc_fs_promises_write_file_string_async(
    const tsc_str_t* path,
    const tsc_str_t* data,
    bool append,
    bool exclusive,
    bool update,
    double file_mode
) {
    return tsc_fs_promises_write_file_async(path, (const uint8_t*)data->data, data->len, data, NULL, append, exclusive, update, file_mode);
}

tsc_promise_t* tsc_fs_promises_write_file_buffer_async(
    const tsc_str_t* path,
    const tsc_buffer_t* data,
    bool append,
    bool exclusive,
    bool update,
    double file_mode
) {
    return tsc_fs_promises_write_file_async(path, data->data, data->len, NULL, data, append, exclusive, update, file_mode);
}

typedef struct tsc_fs_readdir_async {
    tsc_uv_fs_t req;
    tsc_promise_t* promise;
    char* path;
    tsc_array_t* entries;
    bool want_buffer;
    tsc_str_t* error;
    struct tsc_fs_readdir_async* next;
} tsc_fs_readdir_async_t;

static tsc_fs_readdir_async_t* g_tsc_fs_readdir_async = NULL;

static void tsc_fs_readdir_async_remove(tsc_fs_readdir_async_t* task) {
    tsc_fs_readdir_async_t** cursor = &g_tsc_fs_readdir_async;
    while (*cursor) {
        if (*cursor == task) {
            *cursor = task->next;
            task->next = NULL;
            return;
        }
        cursor = &(*cursor)->next;
    }
}

static void tsc_fs_readdir_async_finish(tsc_fs_readdir_async_t* task, bool success) {
    if (success) {
        tsc_promise_fulfill_in_place_ptr(task->promise, task->entries);
    } else {
        tsc_promise_reject_in_place(
            task->promise,
            tsc_value_string(task->error ? task->error : tsc_str_from_cstr("fs.readdirSync: could not open dir"))
        );
    }
    free(task->path);
    tsc_fs_readdir_async_remove(task);
}

static void tsc_fs_readdir_async_scandir_cb(tsc_uv_fs_t* req) {
    tsc_fs_readdir_async_t* task = (tsc_fs_readdir_async_t*)req;
    ssize_t result = uv_fs_get_result(req);
    if (result < 0) {
        uv_fs_req_cleanup(req);
        task->error = tsc_str_from_cstr("fs.readdirSync: could not open dir");
        tsc_fs_readdir_async_finish(task, false);
        return;
    }

    tsc_uv_dirent_t ent;
    while (uv_fs_scandir_next(req, &ent) == 0) {
        if (!ent.name) continue;
        tsc_str_t* name = tsc_str_from_cstr(ent.name);
        if (task->want_buffer) {
            tsc_buffer_t* value = tsc_buffer_from_str(name, NULL);
            tsc_array_push_raw(task->entries, &value);
        } else {
            tsc_array_push_raw(task->entries, &name);
        }
    }
    uv_fs_req_cleanup(req);
    tsc_fs_readdir_async_finish(task, true);
}

tsc_promise_t* tsc_fs_promises_readdir_async(const tsc_str_t* path, bool want_buffer) {
    tsc_promise_t* promise = tsc_promise_pending();
    tsc_fs_readdir_async_t* task = (tsc_fs_readdir_async_t*)TSC_GC_MALLOC(sizeof(tsc_fs_readdir_async_t));
    memset(task, 0, sizeof(*task));
    task->promise = promise;
    task->path = cstr_dup(path);
    task->want_buffer = want_buffer;
    task->entries = tsc_array_new(want_buffer ? sizeof(tsc_buffer_t*) : sizeof(tsc_str_t*), 16);
    task->next = g_tsc_fs_readdir_async;
    g_tsc_fs_readdir_async = task;
    g_tsc_fs_uv_loop = uv_default_loop();
    int rc = uv_fs_scandir(g_tsc_fs_uv_loop, &task->req, task->path, 0, tsc_fs_readdir_async_scandir_cb);
    if (rc < 0) {
        uv_fs_req_cleanup(&task->req);
        task->error = tsc_str_from_cstr("fs.readdirSync: could not open dir");
        tsc_fs_readdir_async_finish(task, false);
    }
    return promise;
}

typedef struct tsc_fs_access_async {
    tsc_uv_fs_t req;
    tsc_promise_t* promise;
    char* path;
    int mode;
    tsc_str_t* error;
    struct tsc_fs_access_async* next;
} tsc_fs_access_async_t;

static tsc_fs_access_async_t* g_tsc_fs_access_async = NULL;

static void tsc_fs_access_async_remove(tsc_fs_access_async_t* task) {
    tsc_fs_access_async_t** cursor = &g_tsc_fs_access_async;
    while (*cursor) {
        if (*cursor == task) {
            *cursor = task->next;
            task->next = NULL;
            return;
        }
        cursor = &(*cursor)->next;
    }
}

static void tsc_fs_access_async_finish(tsc_fs_access_async_t* task, bool success) {
    if (success) {
        tsc_promise_fulfill_in_place(task->promise, tsc_value_undefined());
    } else {
        tsc_promise_reject_in_place(
            task->promise,
            tsc_value_string(task->error ? task->error : tsc_str_from_cstr("fs.access: path is not accessible"))
        );
    }
    free(task->path);
    tsc_fs_access_async_remove(task);
}

static void tsc_fs_access_async_cb(tsc_uv_fs_t* req) {
    tsc_fs_access_async_t* task = (tsc_fs_access_async_t*)req;
    ssize_t result = uv_fs_get_result(req);
    uv_fs_req_cleanup(req);
    if (result < 0) {
        task->error = tsc_str_from_cstr("fs.access: path is not accessible");
        tsc_fs_access_async_finish(task, false);
        return;
    }
    tsc_fs_access_async_finish(task, true);
}

tsc_promise_t* tsc_fs_promises_access_async(const tsc_str_t* path, double mode) {
    tsc_promise_t* promise = tsc_promise_pending();
    tsc_fs_access_async_t* task = (tsc_fs_access_async_t*)TSC_GC_MALLOC(sizeof(tsc_fs_access_async_t));
    memset(task, 0, sizeof(*task));
    task->promise = promise;
    task->path = cstr_dup(path);
    task->mode = isnan(mode) ? F_OK : (int)mode;
    task->next = g_tsc_fs_access_async;
    g_tsc_fs_access_async = task;
    g_tsc_fs_uv_loop = uv_default_loop();
    int rc = uv_fs_access(g_tsc_fs_uv_loop, &task->req, task->path, task->mode, tsc_fs_access_async_cb);
    if (rc < 0) {
        uv_fs_req_cleanup(&task->req);
        task->error = tsc_str_from_cstr("fs.access: path is not accessible");
        tsc_fs_access_async_finish(task, false);
    }
    return promise;
}

typedef struct tsc_fs_stats_libuv_async {
    tsc_uv_fs_t req;
    tsc_promise_t* promise;
    char* path;
    bool throw_if_no_entry;
    bool lstat;
    struct tsc_fs_stats_libuv_async* next;
} tsc_fs_stats_libuv_async_t;

static tsc_fs_stats_libuv_async_t* g_tsc_fs_stats_libuv_async = NULL;

static void tsc_fs_stats_libuv_remove(tsc_fs_stats_libuv_async_t* task) {
    tsc_fs_stats_libuv_async_t** cursor = &g_tsc_fs_stats_libuv_async;
    while (*cursor) {
        if (*cursor == task) {
            *cursor = task->next;
            task->next = NULL;
            return;
        }
        cursor = &(*cursor)->next;
    }
}

static void tsc_fs_stats_libuv_finish(
    tsc_fs_stats_libuv_async_t* task,
    tsc_fs_stats_t* stats,
    tsc_str_t* error
) {
    if (error) {
        tsc_promise_reject_in_place(task->promise, tsc_value_string(error));
    } else {
        tsc_promise_fulfill_in_place_ptr(task->promise, stats);
    }
    free(task->path);
    tsc_fs_stats_libuv_remove(task);
}

static void tsc_fs_stats_libuv_cb(tsc_uv_fs_t* req) {
    tsc_fs_stats_libuv_async_t* task = (tsc_fs_stats_libuv_async_t*)req;
    ssize_t result = uv_fs_get_result(req);
    if (result < 0) {
        bool missing = result == -ENOENT || result == -ENOTDIR;
        uv_fs_req_cleanup(req);
        if (!task->throw_if_no_entry && missing) {
            tsc_fs_stats_libuv_finish(task, NULL, NULL);
        } else {
            tsc_fs_stats_libuv_finish(
                task,
                NULL,
                tsc_str_from_cstr(task->lstat
                    ? "fs.lstatSync: could not stat path"
                    : "fs.statSync: could not stat path")
            );
        }
        return;
    }

    tsc_uv_stat_t* statbuf = uv_fs_get_statbuf(req);
    if (!statbuf) {
        uv_fs_req_cleanup(req);
        tsc_fs_stats_libuv_finish(
            task,
            NULL,
            tsc_str_from_cstr(task->lstat
                ? "fs.lstatSync: could not stat path"
                : "fs.statSync: could not stat path")
        );
        return;
    }
    tsc_fs_stats_t* stats = tsc_fs_stats_new();
    tsc_fs_stats_fill_uv(stats, statbuf);
    uv_fs_req_cleanup(req);
    tsc_fs_stats_libuv_finish(task, stats, NULL);
}

static tsc_promise_t* tsc_fs_promises_stats_libuv_async(
    const tsc_str_t* path,
    bool throw_if_no_entry,
    bool lstat
) {
    tsc_promise_t* promise = tsc_promise_pending();
    tsc_fs_stats_libuv_async_t* task = (tsc_fs_stats_libuv_async_t*)TSC_GC_MALLOC(sizeof(tsc_fs_stats_libuv_async_t));
    memset(task, 0, sizeof(*task));
    task->promise = promise;
    task->path = cstr_dup(path);
    task->throw_if_no_entry = throw_if_no_entry;
    task->lstat = lstat;
    task->next = g_tsc_fs_stats_libuv_async;
    g_tsc_fs_stats_libuv_async = task;
    g_tsc_fs_uv_loop = uv_default_loop();
    int rc = lstat
        ? uv_fs_lstat(g_tsc_fs_uv_loop, &task->req, task->path, tsc_fs_stats_libuv_cb)
        : uv_fs_stat(g_tsc_fs_uv_loop, &task->req, task->path, tsc_fs_stats_libuv_cb);
    if (rc < 0) {
        uv_fs_req_cleanup(&task->req);
        tsc_fs_stats_libuv_finish(
            task,
            NULL,
            tsc_str_from_cstr(lstat
                ? "fs.lstatSync: could not stat path"
                : "fs.statSync: could not stat path")
        );
    }
    return promise;
}

tsc_promise_t* tsc_fs_promises_stat_async(const tsc_str_t* path, bool throw_if_no_entry) {
    return tsc_fs_promises_stats_libuv_async(path, throw_if_no_entry, false);
}

tsc_promise_t* tsc_fs_promises_lstat_async(const tsc_str_t* path, bool throw_if_no_entry) {
    return tsc_fs_promises_stats_libuv_async(path, throw_if_no_entry, true);
}

typedef struct tsc_fs_statfs_libuv_async {
    tsc_uv_fs_t req;
    tsc_promise_t* promise;
    char* path;
    struct tsc_fs_statfs_libuv_async* next;
} tsc_fs_statfs_libuv_async_t;

static tsc_fs_statfs_libuv_async_t* g_tsc_fs_statfs_libuv_async = NULL;

static void tsc_fs_statfs_libuv_remove(tsc_fs_statfs_libuv_async_t* task) {
    tsc_fs_statfs_libuv_async_t** cursor = &g_tsc_fs_statfs_libuv_async;
    while (*cursor) {
        if (*cursor == task) {
            *cursor = task->next;
            task->next = NULL;
            return;
        }
        cursor = &(*cursor)->next;
    }
}

static void tsc_fs_statfs_libuv_finish(
    tsc_fs_statfs_libuv_async_t* task,
    tsc_value_t value,
    tsc_str_t* error
) {
    if (error) {
        tsc_promise_reject_in_place(task->promise, tsc_value_string(error));
    } else {
        tsc_promise_fulfill_in_place(task->promise, value);
    }
    free(task->path);
    tsc_fs_statfs_libuv_remove(task);
}

static void tsc_fs_statfs_libuv_cb(tsc_uv_fs_t* req) {
    tsc_fs_statfs_libuv_async_t* task = (tsc_fs_statfs_libuv_async_t*)req;
    ssize_t result = uv_fs_get_result(req);
    if (result < 0) {
        uv_fs_req_cleanup(req);
        tsc_fs_statfs_libuv_finish(
            task,
            tsc_value_undefined(),
            tsc_str_from_cstr("fs.statfsSync: could not statfs path")
        );
        return;
    }

    tsc_uv_statfs_t* statfs = (tsc_uv_statfs_t*)uv_fs_get_ptr(req);
    if (!statfs) {
        uv_fs_req_cleanup(req);
        tsc_fs_statfs_libuv_finish(
            task,
            tsc_value_undefined(),
            tsc_str_from_cstr("fs.statfsSync: could not statfs path")
        );
        return;
    }

    tsc_object_t* out = tsc_object_new();
    tsc_object_set(out, tsc_str_from_lit("bsize", 5), tsc_value_num((double)statfs->f_bsize));
    tsc_object_set(out, tsc_str_from_lit("frsize", 6), tsc_value_num((double)statfs->f_bsize));
    tsc_object_set(out, tsc_str_from_lit("blocks", 6), tsc_value_num((double)statfs->f_blocks));
    tsc_object_set(out, tsc_str_from_lit("bfree", 5), tsc_value_num((double)statfs->f_bfree));
    tsc_object_set(out, tsc_str_from_lit("bavail", 6), tsc_value_num((double)statfs->f_bavail));
    tsc_object_set(out, tsc_str_from_lit("files", 5), tsc_value_num((double)statfs->f_files));
    tsc_object_set(out, tsc_str_from_lit("ffree", 5), tsc_value_num((double)statfs->f_ffree));
    tsc_value_t value = tsc_value_object(out);
    uv_fs_req_cleanup(req);
    tsc_fs_statfs_libuv_finish(task, value, NULL);
}

tsc_promise_t* tsc_fs_promises_statfs_async(const tsc_str_t* path) {
    tsc_promise_t* promise = tsc_promise_pending();
    tsc_fs_statfs_libuv_async_t* task = (tsc_fs_statfs_libuv_async_t*)TSC_GC_MALLOC(sizeof(tsc_fs_statfs_libuv_async_t));
    memset(task, 0, sizeof(*task));
    task->promise = promise;
    task->path = cstr_dup(path);
    task->next = g_tsc_fs_statfs_libuv_async;
    g_tsc_fs_statfs_libuv_async = task;
    g_tsc_fs_uv_loop = uv_default_loop();
    int rc = uv_fs_statfs(g_tsc_fs_uv_loop, &task->req, task->path, tsc_fs_statfs_libuv_cb);
    if (rc < 0) {
        uv_fs_req_cleanup(&task->req);
        tsc_fs_statfs_libuv_finish(
            task,
            tsc_value_undefined(),
            tsc_str_from_cstr("fs.statfsSync: could not statfs path")
        );
    }
    return promise;
}

typedef struct tsc_fs_copy_file_libuv_async {
    tsc_uv_fs_t req;
    tsc_promise_t* promise;
    char* src;
    char* dest;
    int flags;
    struct tsc_fs_copy_file_libuv_async* next;
} tsc_fs_copy_file_libuv_async_t;

static tsc_fs_copy_file_libuv_async_t* g_tsc_fs_copy_file_libuv_async = NULL;

static void tsc_fs_copy_file_libuv_remove(tsc_fs_copy_file_libuv_async_t* task) {
    tsc_fs_copy_file_libuv_async_t** cursor = &g_tsc_fs_copy_file_libuv_async;
    while (*cursor) {
        if (*cursor == task) {
            *cursor = task->next;
            task->next = NULL;
            return;
        }
        cursor = &(*cursor)->next;
    }
}

static void tsc_fs_copy_file_libuv_finish(tsc_fs_copy_file_libuv_async_t* task, tsc_str_t* error) {
    if (error) {
        tsc_promise_reject_in_place(task->promise, tsc_value_string(error));
    } else {
        tsc_promise_fulfill_in_place(task->promise, tsc_value_undefined());
    }
    free(task->src);
    free(task->dest);
    tsc_fs_copy_file_libuv_remove(task);
}

static void tsc_fs_copy_file_libuv_cb(tsc_uv_fs_t* req) {
    tsc_fs_copy_file_libuv_async_t* task = (tsc_fs_copy_file_libuv_async_t*)req;
    ssize_t result = uv_fs_get_result(req);
    uv_fs_req_cleanup(req);
    if (result < 0) {
        if (result == -EEXIST && (task->flags & TSC_UV_FS_COPYFILE_EXCL) != 0) {
            tsc_fs_copy_file_libuv_finish(task, tsc_str_from_cstr("fs.copyFileSync: destination already exists"));
        } else if (result == -ENOENT) {
            tsc_fs_copy_file_libuv_finish(task, tsc_str_from_cstr("fs.readFileSync: could not open file"));
        } else {
            tsc_fs_copy_file_libuv_finish(task, tsc_str_from_cstr("fs.copyFileSync: could not copy file"));
        }
        return;
    }
    tsc_fs_copy_file_libuv_finish(task, NULL);
}

tsc_promise_t* tsc_fs_promises_copy_file_async(const tsc_str_t* src, const tsc_str_t* dest, double mode) {
    tsc_promise_t* promise = tsc_promise_pending();
    tsc_fs_copy_file_libuv_async_t* task = (tsc_fs_copy_file_libuv_async_t*)TSC_GC_MALLOC(sizeof(tsc_fs_copy_file_libuv_async_t));
    memset(task, 0, sizeof(*task));
    task->promise = promise;
    task->src = cstr_dup(src);
    task->dest = cstr_dup(dest);
    task->flags = (isnan(mode) || isinf(mode)) ? 0 : (int)mode;
    task->next = g_tsc_fs_copy_file_libuv_async;
    g_tsc_fs_copy_file_libuv_async = task;
    g_tsc_fs_uv_loop = uv_default_loop();
    int rc = uv_fs_copyfile(g_tsc_fs_uv_loop, &task->req, task->src, task->dest, task->flags, tsc_fs_copy_file_libuv_cb);
    if (rc < 0) {
        uv_fs_req_cleanup(&task->req);
        tsc_fs_copy_file_libuv_finish(task, tsc_str_from_cstr("fs.copyFileSync: could not copy file"));
    }
    return promise;
}

typedef struct tsc_fs_rename_libuv_async {
    tsc_uv_fs_t req;
    tsc_promise_t* promise;
    char* old_path;
    char* new_path;
    struct tsc_fs_rename_libuv_async* next;
} tsc_fs_rename_libuv_async_t;

static tsc_fs_rename_libuv_async_t* g_tsc_fs_rename_libuv_async = NULL;

static void tsc_fs_rename_libuv_remove(tsc_fs_rename_libuv_async_t* task) {
    tsc_fs_rename_libuv_async_t** cursor = &g_tsc_fs_rename_libuv_async;
    while (*cursor) {
        if (*cursor == task) {
            *cursor = task->next;
            task->next = NULL;
            return;
        }
        cursor = &(*cursor)->next;
    }
}

static void tsc_fs_rename_libuv_finish(tsc_fs_rename_libuv_async_t* task, tsc_str_t* error) {
    if (error) {
        tsc_promise_reject_in_place(task->promise, tsc_value_string(error));
    } else {
        tsc_promise_fulfill_in_place(task->promise, tsc_value_undefined());
    }
    free(task->old_path);
    free(task->new_path);
    tsc_fs_rename_libuv_remove(task);
}

static void tsc_fs_rename_libuv_cb(tsc_uv_fs_t* req) {
    tsc_fs_rename_libuv_async_t* task = (tsc_fs_rename_libuv_async_t*)req;
    ssize_t result = uv_fs_get_result(req);
    uv_fs_req_cleanup(req);
    if (result < 0) {
        tsc_fs_rename_libuv_finish(task, tsc_str_from_cstr("fs.renameSync: could not rename path"));
        return;
    }
    tsc_fs_rename_libuv_finish(task, NULL);
}

tsc_promise_t* tsc_fs_promises_rename_async(const tsc_str_t* old_path, const tsc_str_t* new_path) {
    tsc_promise_t* promise = tsc_promise_pending();
    tsc_fs_rename_libuv_async_t* task = (tsc_fs_rename_libuv_async_t*)TSC_GC_MALLOC(sizeof(tsc_fs_rename_libuv_async_t));
    memset(task, 0, sizeof(*task));
    task->promise = promise;
    task->old_path = cstr_dup(old_path);
    task->new_path = cstr_dup(new_path);
    task->next = g_tsc_fs_rename_libuv_async;
    g_tsc_fs_rename_libuv_async = task;
    g_tsc_fs_uv_loop = uv_default_loop();
    int rc = uv_fs_rename(g_tsc_fs_uv_loop, &task->req, task->old_path, task->new_path, tsc_fs_rename_libuv_cb);
    if (rc < 0) {
        uv_fs_req_cleanup(&task->req);
        tsc_fs_rename_libuv_finish(task, tsc_str_from_cstr("fs.renameSync: could not rename path"));
    }
    return promise;
}

typedef struct tsc_fs_link_libuv_async {
    tsc_uv_fs_t req;
    tsc_promise_t* promise;
    char* old_path;
    char* new_path;
    bool symlink;
    struct tsc_fs_link_libuv_async* next;
} tsc_fs_link_libuv_async_t;

static tsc_fs_link_libuv_async_t* g_tsc_fs_link_libuv_async = NULL;

static void tsc_fs_link_libuv_remove(tsc_fs_link_libuv_async_t* task) {
    tsc_fs_link_libuv_async_t** cursor = &g_tsc_fs_link_libuv_async;
    while (*cursor) {
        if (*cursor == task) {
            *cursor = task->next;
            task->next = NULL;
            return;
        }
        cursor = &(*cursor)->next;
    }
}

static void tsc_fs_link_libuv_finish(tsc_fs_link_libuv_async_t* task, tsc_str_t* error) {
    if (error) {
        tsc_promise_reject_in_place(task->promise, tsc_value_string(error));
    } else {
        tsc_promise_fulfill_in_place(task->promise, tsc_value_undefined());
    }
    free(task->old_path);
    free(task->new_path);
    tsc_fs_link_libuv_remove(task);
}

static void tsc_fs_link_libuv_cb(tsc_uv_fs_t* req) {
    tsc_fs_link_libuv_async_t* task = (tsc_fs_link_libuv_async_t*)req;
    ssize_t result = uv_fs_get_result(req);
    uv_fs_req_cleanup(req);
    if (result < 0) {
        tsc_fs_link_libuv_finish(task, tsc_str_from_cstr(task->symlink
            ? "fs.symlinkSync: could not create link"
            : "fs.linkSync: could not create link"));
        return;
    }
    tsc_fs_link_libuv_finish(task, NULL);
}

static tsc_promise_t* tsc_fs_promises_link_libuv_async(
    const tsc_str_t* old_path,
    const tsc_str_t* new_path,
    bool symlink
) {
    tsc_promise_t* promise = tsc_promise_pending();
    tsc_fs_link_libuv_async_t* task = (tsc_fs_link_libuv_async_t*)TSC_GC_MALLOC(sizeof(tsc_fs_link_libuv_async_t));
    memset(task, 0, sizeof(*task));
    task->promise = promise;
    task->old_path = cstr_dup(old_path);
    task->new_path = cstr_dup(new_path);
    task->symlink = symlink;
    task->next = g_tsc_fs_link_libuv_async;
    g_tsc_fs_link_libuv_async = task;
    g_tsc_fs_uv_loop = uv_default_loop();
    int rc = symlink
        ? uv_fs_symlink(g_tsc_fs_uv_loop, &task->req, task->old_path, task->new_path, 0, tsc_fs_link_libuv_cb)
        : uv_fs_link(g_tsc_fs_uv_loop, &task->req, task->old_path, task->new_path, tsc_fs_link_libuv_cb);
    if (rc < 0) {
        uv_fs_req_cleanup(&task->req);
        tsc_fs_link_libuv_finish(task, tsc_str_from_cstr(symlink
            ? "fs.symlinkSync: could not create link"
            : "fs.linkSync: could not create link"));
    }
    return promise;
}

tsc_promise_t* tsc_fs_promises_symlink_async(const tsc_str_t* target, const tsc_str_t* path) {
    return tsc_fs_promises_link_libuv_async(target, path, true);
}

tsc_promise_t* tsc_fs_promises_link_async(const tsc_str_t* existing_path, const tsc_str_t* new_path) {
    return tsc_fs_promises_link_libuv_async(existing_path, new_path, false);
}

typedef struct tsc_fs_times_libuv_async {
    tsc_uv_fs_t req;
    tsc_promise_t* promise;
    char* path;
    double atime;
    double mtime;
    bool lutimes;
    struct tsc_fs_times_libuv_async* next;
} tsc_fs_times_libuv_async_t;

static tsc_fs_times_libuv_async_t* g_tsc_fs_times_libuv_async = NULL;

static void tsc_fs_times_libuv_remove(tsc_fs_times_libuv_async_t* task) {
    tsc_fs_times_libuv_async_t** cursor = &g_tsc_fs_times_libuv_async;
    while (*cursor) {
        if (*cursor == task) {
            *cursor = task->next;
            task->next = NULL;
            return;
        }
        cursor = &(*cursor)->next;
    }
}

static void tsc_fs_times_libuv_finish(tsc_fs_times_libuv_async_t* task, tsc_str_t* error) {
    if (error) {
        tsc_promise_reject_in_place(task->promise, tsc_value_string(error));
    } else {
        tsc_promise_fulfill_in_place(task->promise, tsc_value_undefined());
    }
    free(task->path);
    tsc_fs_times_libuv_remove(task);
}

static void tsc_fs_times_libuv_cb(tsc_uv_fs_t* req) {
    tsc_fs_times_libuv_async_t* task = (tsc_fs_times_libuv_async_t*)req;
    ssize_t result = uv_fs_get_result(req);
    uv_fs_req_cleanup(req);
    if (result < 0) {
        tsc_fs_times_libuv_finish(task, tsc_str_from_cstr(task->lutimes
            ? "fs.lutimesSync: could not update symlink timestamps"
            : "fs.utimesSync: could not update timestamps"));
        return;
    }
    tsc_fs_times_libuv_finish(task, NULL);
}

static tsc_promise_t* tsc_fs_promises_times_libuv_async(
    const tsc_str_t* path,
    double atime,
    double mtime,
    bool lutimes
) {
    tsc_promise_t* promise = tsc_promise_pending();
    tsc_fs_times_libuv_async_t* task = (tsc_fs_times_libuv_async_t*)TSC_GC_MALLOC(sizeof(tsc_fs_times_libuv_async_t));
    memset(task, 0, sizeof(*task));
    task->promise = promise;
    task->path = cstr_dup(path);
    task->atime = atime;
    task->mtime = mtime;
    task->lutimes = lutimes;
    task->next = g_tsc_fs_times_libuv_async;
    g_tsc_fs_times_libuv_async = task;
    g_tsc_fs_uv_loop = uv_default_loop();
    int rc = lutimes
        ? uv_fs_lutime(g_tsc_fs_uv_loop, &task->req, task->path, task->atime, task->mtime, tsc_fs_times_libuv_cb)
        : uv_fs_utime(g_tsc_fs_uv_loop, &task->req, task->path, task->atime, task->mtime, tsc_fs_times_libuv_cb);
    if (rc < 0) {
        uv_fs_req_cleanup(&task->req);
        tsc_fs_times_libuv_finish(task, tsc_str_from_cstr(lutimes
            ? "fs.lutimesSync: could not update symlink timestamps"
            : "fs.utimesSync: could not update timestamps"));
    }
    return promise;
}

tsc_promise_t* tsc_fs_promises_utimes_async(const tsc_str_t* path, double atime, double mtime) {
    return tsc_fs_promises_times_libuv_async(path, atime, mtime, false);
}

tsc_promise_t* tsc_fs_promises_lutimes_async(const tsc_str_t* path, double atime, double mtime) {
    return tsc_fs_promises_times_libuv_async(path, atime, mtime, true);
}

typedef struct tsc_fs_realpath_libuv_async {
    tsc_uv_fs_t req;
    tsc_promise_t* promise;
    char* path;
    int encoding;
    bool readlink;
    bool mkdtemp;
    struct tsc_fs_realpath_libuv_async* next;
} tsc_fs_realpath_libuv_async_t;

static tsc_fs_realpath_libuv_async_t* g_tsc_fs_realpath_libuv_async = NULL;

static void tsc_fs_realpath_libuv_remove(tsc_fs_realpath_libuv_async_t* task) {
    tsc_fs_realpath_libuv_async_t** cursor = &g_tsc_fs_realpath_libuv_async;
    while (*cursor) {
        if (*cursor == task) {
            *cursor = task->next;
            task->next = NULL;
            return;
        }
        cursor = &(*cursor)->next;
    }
}

static void tsc_fs_realpath_libuv_finish(
    tsc_fs_realpath_libuv_async_t* task,
    tsc_value_t value,
    void* ptr_value,
    tsc_str_t* error
) {
    if (error) {
        tsc_promise_reject_in_place(task->promise, tsc_value_string(error));
    } else if (ptr_value) {
        tsc_promise_fulfill_in_place_ptr(task->promise, ptr_value);
    } else {
        tsc_promise_fulfill_in_place(task->promise, value);
    }
    free(task->path);
    tsc_fs_realpath_libuv_remove(task);
}

static void tsc_fs_realpath_libuv_cb(tsc_uv_fs_t* req) {
    tsc_fs_realpath_libuv_async_t* task = (tsc_fs_realpath_libuv_async_t*)req;
    ssize_t result = uv_fs_get_result(req);
    if (result < 0) {
        uv_fs_req_cleanup(req);
        tsc_fs_realpath_libuv_finish(
            task,
            tsc_value_undefined(),
            NULL,
            tsc_str_from_cstr(task->mkdtemp
                ? "fs.mkdtempSync: could not create directory"
                : task->readlink
                    ? "fs.readlinkSync: could not read link"
                    : "fs.realpathSync: could not resolve path")
        );
        return;
    }

    const char* resolved = task->mkdtemp
        ? uv_fs_get_path(req)
        : (const char*)uv_fs_get_ptr(req);
    if (!resolved) {
        uv_fs_req_cleanup(req);
        tsc_fs_realpath_libuv_finish(
            task,
            tsc_value_undefined(),
            NULL,
            tsc_str_from_cstr(task->mkdtemp
                ? "fs.mkdtempSync: could not create directory"
                : task->readlink
                    ? "fs.readlinkSync: could not read link"
                    : "fs.realpathSync: could not resolve path")
        );
        return;
    }

    tsc_str_t* path = tsc_str_from_cstr(resolved);
    tsc_value_t value = tsc_value_undefined();
    void* ptr_value = NULL;
    if (task->encoding == 3) {
        ptr_value = tsc_buffer_from_str(path, NULL);
    } else if (task->encoding == 1 || task->encoding == 2) {
        tsc_buffer_t* bytes = tsc_buffer_from_str(path, NULL);
        value = tsc_value_string(tsc_buffer_to_string(bytes, task->encoding == 1
            ? tsc_str_from_lit("hex", 3)
            : tsc_str_from_lit("base64", 6)));
    } else {
        value = tsc_value_string(path);
    }
    uv_fs_req_cleanup(req);
    tsc_fs_realpath_libuv_finish(task, value, ptr_value, NULL);
}

static tsc_promise_t* tsc_fs_promises_path_result_async(const tsc_str_t* path, int encoding, bool readlink, bool mkdtemp) {
    tsc_promise_t* promise = tsc_promise_pending();
    tsc_fs_realpath_libuv_async_t* task = (tsc_fs_realpath_libuv_async_t*)TSC_GC_MALLOC(sizeof(tsc_fs_realpath_libuv_async_t));
    memset(task, 0, sizeof(*task));
    task->promise = promise;
    task->path = cstr_dup(path);
    task->encoding = encoding;
    task->readlink = readlink;
    task->mkdtemp = mkdtemp;
    if (mkdtemp) {
        size_t prefix_len = strlen(task->path);
        char* template = (char*)malloc(prefix_len + 7);
        memcpy(template, task->path, prefix_len);
        memcpy(template + prefix_len, "XXXXXX", 7);
        free(task->path);
        task->path = template;
    }
    task->next = g_tsc_fs_realpath_libuv_async;
    g_tsc_fs_realpath_libuv_async = task;
    g_tsc_fs_uv_loop = uv_default_loop();
    int rc = readlink
        ? uv_fs_readlink(g_tsc_fs_uv_loop, &task->req, task->path, tsc_fs_realpath_libuv_cb)
        : mkdtemp
            ? uv_fs_mkdtemp(g_tsc_fs_uv_loop, &task->req, task->path, tsc_fs_realpath_libuv_cb)
            : uv_fs_realpath(g_tsc_fs_uv_loop, &task->req, task->path, tsc_fs_realpath_libuv_cb);
    if (rc < 0) {
        uv_fs_req_cleanup(&task->req);
        tsc_fs_realpath_libuv_finish(
            task,
            tsc_value_undefined(),
            NULL,
            tsc_str_from_cstr(mkdtemp
                ? "fs.mkdtempSync: could not create directory"
                : readlink
                    ? "fs.readlinkSync: could not read link"
                    : "fs.realpathSync: could not resolve path")
        );
    }
    return promise;
}

tsc_promise_t* tsc_fs_promises_realpath_async(const tsc_str_t* path, int encoding) {
    return tsc_fs_promises_path_result_async(path, encoding, false, false);
}

tsc_promise_t* tsc_fs_promises_readlink_async(const tsc_str_t* path, int encoding) {
    return tsc_fs_promises_path_result_async(path, encoding, true, false);
}

tsc_promise_t* tsc_fs_promises_mkdtemp_async(const tsc_str_t* prefix, int encoding) {
    return tsc_fs_promises_path_result_async(prefix, encoding, false, true);
}

bool tsc_fs_libuv_pending(void) {
    return g_tsc_fs_read_file_async != NULL || g_tsc_fs_write_file_async != NULL || g_tsc_fs_readdir_async != NULL || g_tsc_fs_access_async != NULL || g_tsc_fs_stats_libuv_async != NULL || g_tsc_fs_statfs_libuv_async != NULL || g_tsc_fs_copy_file_libuv_async != NULL || g_tsc_fs_rename_libuv_async != NULL || g_tsc_fs_link_libuv_async != NULL || g_tsc_fs_times_libuv_async != NULL || g_tsc_fs_realpath_libuv_async != NULL;
}

void tsc_fs_libuv_run_once(bool block) {
    if (!tsc_fs_libuv_pending()) return;
    (void)uv_run(g_tsc_fs_uv_loop, block ? TSC_UV_RUN_ONCE : TSC_UV_RUN_NOWAIT);
}
#else
bool tsc_fs_libuv_pending(void) { return false; }
void tsc_fs_libuv_run_once(bool block) { (void)block; }
#endif

struct tsc_fs_stats {
    double dev;
    double ino;
    double size;
    double mode;
    double nlink;
    double uid;
    double gid;
    double rdev;
    double blksize;
    double blocks;
    double atime_ms;
    double mtime_ms;
    double ctime_ms;
    double birthtime_ms;
    bool is_file;
    bool is_directory;
    bool is_symbolic_link;
    bool is_block_device;
    bool is_character_device;
    bool is_fifo;
    bool is_socket;
};

struct tsc_fs_dirent {
    tsc_str_t* name;
    bool is_file;
    bool is_directory;
    bool is_symbolic_link;
    bool is_block_device;
    bool is_character_device;
    bool is_fifo;
    bool is_socket;
};

void fs_kind_from_mode(mode_t mode, bool* is_file, bool* is_directory, bool* is_symbolic_link, bool* is_block_device, bool* is_character_device, bool* is_fifo, bool* is_socket) {
    *is_file = S_ISREG(mode);
    *is_directory = S_ISDIR(mode);
    *is_symbolic_link = S_ISLNK(mode);
    *is_block_device = S_ISBLK(mode);
    *is_character_device = S_ISCHR(mode);
    *is_fifo = S_ISFIFO(mode);
    *is_socket = S_ISSOCK(mode);
}

double fs_timespec_to_ms(time_t sec, long nsec) {
    return ((double)sec * 1000.0) + ((double)nsec / 1000000.0);
}

double fs_stat_atime_ms(const struct stat* st) {
#if defined(__APPLE__) && defined(__MACH__)
    return fs_timespec_to_ms(st->st_atimespec.tv_sec, st->st_atimespec.tv_nsec);
#else
    return fs_timespec_to_ms(st->st_atim.tv_sec, st->st_atim.tv_nsec);
#endif
}

double fs_stat_mtime_ms(const struct stat* st) {
#if defined(__APPLE__) && defined(__MACH__)
    return fs_timespec_to_ms(st->st_mtimespec.tv_sec, st->st_mtimespec.tv_nsec);
#else
    return fs_timespec_to_ms(st->st_mtim.tv_sec, st->st_mtim.tv_nsec);
#endif
}

double fs_stat_ctime_ms(const struct stat* st) {
#if defined(__APPLE__) && defined(__MACH__)
    return fs_timespec_to_ms(st->st_ctimespec.tv_sec, st->st_ctimespec.tv_nsec);
#else
    return fs_timespec_to_ms(st->st_ctim.tv_sec, st->st_ctim.tv_nsec);
#endif
}

double fs_stat_birthtime_ms(const struct stat* st) {
#if defined(__APPLE__) && defined(__MACH__)
    return fs_timespec_to_ms(st->st_birthtimespec.tv_sec, st->st_birthtimespec.tv_nsec);
#else
    return fs_stat_ctime_ms(st);
#endif
}

void fs_stats_fill(tsc_fs_stats_t* out, const struct stat* st) {
    out->dev = (double)st->st_dev;
    out->ino = (double)st->st_ino;
    out->size = (double)st->st_size;
    out->mode = (double)st->st_mode;
    out->nlink = (double)st->st_nlink;
    out->uid = (double)st->st_uid;
    out->gid = (double)st->st_gid;
    out->rdev = (double)st->st_rdev;
    out->blksize = (double)st->st_blksize;
    out->blocks = (double)st->st_blocks;
    out->atime_ms = fs_stat_atime_ms(st);
    out->mtime_ms = fs_stat_mtime_ms(st);
    out->ctime_ms = fs_stat_ctime_ms(st);
    out->birthtime_ms = fs_stat_birthtime_ms(st);
    fs_kind_from_mode(
        st->st_mode,
        &out->is_file,
        &out->is_directory,
        &out->is_symbolic_link,
        &out->is_block_device,
        &out->is_character_device,
        &out->is_fifo,
        &out->is_socket
    );
}

#ifdef TSC_HAS_LIBUV
static tsc_fs_stats_t* tsc_fs_stats_new(void) {
    return (tsc_fs_stats_t*)TSC_GC_MALLOC(sizeof(tsc_fs_stats_t));
}

static double fs_uv_timespec_to_ms(const tsc_uv_timespec_t* value) {
    return ((double)value->tv_sec * 1000.0) + ((double)value->tv_nsec / 1000000.0);
}

static void tsc_fs_stats_fill_uv(tsc_fs_stats_t* out, const tsc_uv_stat_t* st) {
    out->dev = (double)st->st_dev;
    out->ino = (double)st->st_ino;
    out->size = (double)st->st_size;
    out->mode = (double)st->st_mode;
    out->nlink = (double)st->st_nlink;
    out->uid = (double)st->st_uid;
    out->gid = (double)st->st_gid;
    out->rdev = (double)st->st_rdev;
    out->blksize = (double)st->st_blksize;
    out->blocks = (double)st->st_blocks;
    out->atime_ms = fs_uv_timespec_to_ms(&st->st_atim);
    out->mtime_ms = fs_uv_timespec_to_ms(&st->st_mtim);
    out->ctime_ms = fs_uv_timespec_to_ms(&st->st_ctim);
    out->birthtime_ms = fs_uv_timespec_to_ms(&st->st_birthtim);
    fs_kind_from_mode(
        (mode_t)st->st_mode,
        &out->is_file,
        &out->is_directory,
        &out->is_symbolic_link,
        &out->is_block_device,
        &out->is_character_device,
        &out->is_fifo,
        &out->is_socket
    );
}
#endif

tsc_fs_dirent_t* fs_dirent_from_path(const char* dir_path, const char* name) {
    tsc_fs_dirent_t* out = (tsc_fs_dirent_t*)TSC_GC_MALLOC(sizeof(tsc_fs_dirent_t));
    out->name = tsc_str_from_cstr(name);
    out->is_file = false;
    out->is_directory = false;
    out->is_symbolic_link = false;
    out->is_block_device = false;
    out->is_character_device = false;
    out->is_fifo = false;
    out->is_socket = false;

    size_t dir_len = strlen(dir_path);
    size_t name_len = strlen(name);
    bool need_slash = dir_len > 0 && dir_path[dir_len - 1] != '/';
    char* full = (char*)malloc(dir_len + (need_slash ? 1 : 0) + name_len + 1);
    memcpy(full, dir_path, dir_len);
    size_t pos = dir_len;
    if (need_slash) full[pos++] = '/';
    memcpy(full + pos, name, name_len);
    full[pos + name_len] = '\0';

    struct stat st;
    if (lstat(full, &st) == 0) {
        fs_kind_from_mode(
            st.st_mode,
            &out->is_file,
            &out->is_directory,
            &out->is_symbolic_link,
            &out->is_block_device,
            &out->is_character_device,
            &out->is_fifo,
            &out->is_socket
        );
    }
    free(full);
    return out;
}

char* fs_join_path(const char* left, const char* right) {
    size_t left_len = strlen(left);
    size_t right_len = strlen(right);
    bool need_slash = left_len > 0 && left[left_len - 1] != '/';
    char* out = (char*)malloc(left_len + (need_slash ? 1 : 0) + right_len + 1);
    memcpy(out, left, left_len);
    size_t pos = left_len;
    if (need_slash) out[pos++] = '/';
    memcpy(out + pos, right, right_len);
    out[pos + right_len] = '\0';
    return out;
}

tsc_str_t* tsc_fs_read_file_sync(const tsc_str_t* path) {
    char* p = cstr_dup(path);
    FILE* f = fopen(p, "rb");
    free(p);
    if (!f) {
        tsc_throw_str(tsc_str_from_cstr("fs.readFileSync: could not open file"));
        return NULL;
    }
    fseek(f, 0, SEEK_END);
    long n = ftell(f);
    fseek(f, 0, SEEK_SET);
    if (n < 0) { fclose(f); tsc_throw_str(tsc_str_from_cstr("fs.readFileSync: seek")); return NULL; }
    tsc_str_t* s = str_alloc((size_t)n);
    size_t rd = fread((char*)s->data, 1, (size_t)n, f);
    fclose(f);
    s->len = rd;
    ((char*)s->data)[rd] = '\0';
    return s;
}

tsc_buffer_t* tsc_fs_read_file_buffer_sync(const tsc_str_t* path) {
    return tsc_buffer_from_str(tsc_fs_read_file_sync(path), NULL);
}

void fs_write_bytes_opts_mode(const tsc_str_t* path, const uint8_t* data, size_t len, bool append, bool exclusive, bool update, double file_mode, const char* label) {
    char* p = cstr_dup(path);
    bool existed = access(p, F_OK) == 0;
    if (exclusive && existed) {
        free(p);
        tsc_throw_str(tsc_str_from_cstr("fs.writeFileSync: file already exists"));
        return;
    }
    const char* open_mode = update ? "rb+" : (append ? "ab" : "wb");
    FILE* f = fopen(p, open_mode);
    if (!f) { free(p); tsc_throw_str(tsc_str_from_cstr(label)); return; }
    fwrite(data, 1, len, f);
    fclose(f);
    if (file_mode >= 0.0 && !existed) {
        if (chmod(p, (mode_t)file_mode) != 0) {
            free(p);
            tsc_throw_str(tsc_str_from_cstr("fs.writeFileSync: could not set mode"));
            return;
        }
    }
    free(p);
}

void fs_write_bytes_opts(const tsc_str_t* path, const uint8_t* data, size_t len, bool append, bool exclusive, const char* label) {
    fs_write_bytes_opts_mode(path, data, len, append, exclusive, false, -1.0, label);
}

void fs_write_bytes(const tsc_str_t* path, const uint8_t* data, size_t len, const char* mode, const char* label) {
    fs_write_bytes_opts(path, data, len, mode[0] == 'a', false, label);
}

void tsc_fs_write_file_sync(const tsc_str_t* path, const tsc_str_t* data) {
    fs_write_bytes(path, (const uint8_t*)data->data, data->len, "wb", "fs.writeFileSync: could not open");
}

void tsc_fs_write_file_buffer_sync(const tsc_str_t* path, const tsc_buffer_t* data) {
    fs_write_bytes(path, data->data, data->len, "wb", "fs.writeFileSync: could not open");
}

void tsc_fs_write_file_sync_opts(const tsc_str_t* path, const tsc_str_t* data, bool append, bool exclusive) {
    fs_write_bytes_opts(path, (const uint8_t*)data->data, data->len, append, exclusive, "fs.writeFileSync: could not open");
}

void tsc_fs_write_file_buffer_sync_opts(const tsc_str_t* path, const tsc_buffer_t* data, bool append, bool exclusive) {
    fs_write_bytes_opts(path, data->data, data->len, append, exclusive, "fs.writeFileSync: could not open");
}

void tsc_fs_write_file_sync_opts_mode(const tsc_str_t* path, const tsc_str_t* data, bool append, bool exclusive, bool update, double mode) {
    fs_write_bytes_opts_mode(path, (const uint8_t*)data->data, data->len, append, exclusive, update, mode, "fs.writeFileSync: could not open");
}

void tsc_fs_write_file_buffer_sync_opts_mode(const tsc_str_t* path, const tsc_buffer_t* data, bool append, bool exclusive, bool update, double mode) {
    fs_write_bytes_opts_mode(path, data->data, data->len, append, exclusive, update, mode, "fs.writeFileSync: could not open");
}

void tsc_fs_append_file_sync(const tsc_str_t* path, const tsc_str_t* data) {
    fs_write_bytes(path, (const uint8_t*)data->data, data->len, "ab", "fs.appendFileSync: could not open");
}

void tsc_fs_append_file_buffer_sync(const tsc_str_t* path, const tsc_buffer_t* data) {
    fs_write_bytes(path, data->data, data->len, "ab", "fs.appendFileSync: could not open");
}

bool tsc_fs_exists_sync(const tsc_str_t* path) {
    char* p = cstr_dup(path);
    struct stat st;
    int r = stat(p, &st);
    free(p);
    return r == 0;
}

tsc_fs_stats_t* tsc_fs_stat_sync(const tsc_str_t* path) {
    char* p = cstr_dup(path);
    struct stat st;
    int r = stat(p, &st);
    free(p);
    if (r != 0) {
        tsc_throw_str(tsc_str_from_cstr("fs.statSync: could not stat path"));
        return NULL;
    }
    tsc_fs_stats_t* out = (tsc_fs_stats_t*)TSC_GC_MALLOC(sizeof(tsc_fs_stats_t));
    fs_stats_fill(out, &st);
    return out;
}

tsc_fs_stats_t* tsc_fs_stat_sync_no_throw(const tsc_str_t* path) {
    char* p = cstr_dup(path);
    struct stat st;
    int r = stat(p, &st);
    int err = errno;
    free(p);
    if (r != 0) {
        if (err == ENOENT || err == ENOTDIR) return NULL;
        tsc_throw_str(tsc_str_from_cstr("fs.statSync: could not stat path"));
        return NULL;
    }
    tsc_fs_stats_t* out = (tsc_fs_stats_t*)TSC_GC_MALLOC(sizeof(tsc_fs_stats_t));
    fs_stats_fill(out, &st);
    return out;
}

tsc_value_t tsc_fs_statfs_sync(const tsc_str_t* path) {
    char* p = cstr_dup(path);
    struct statvfs st;
    int r = statvfs(p, &st);
    free(p);
    if (r != 0) {
        tsc_throw_str(tsc_str_from_cstr("fs.statfsSync: could not statfs path"));
        return tsc_value_undefined();
    }
    tsc_object_t* out = tsc_object_new();
    tsc_object_set(out, tsc_str_from_lit("bsize", 5), tsc_value_num((double)st.f_bsize));
    tsc_object_set(out, tsc_str_from_lit("frsize", 6), tsc_value_num((double)st.f_frsize));
    tsc_object_set(out, tsc_str_from_lit("blocks", 6), tsc_value_num((double)st.f_blocks));
    tsc_object_set(out, tsc_str_from_lit("bfree", 5), tsc_value_num((double)st.f_bfree));
    tsc_object_set(out, tsc_str_from_lit("bavail", 6), tsc_value_num((double)st.f_bavail));
    tsc_object_set(out, tsc_str_from_lit("files", 5), tsc_value_num((double)st.f_files));
    tsc_object_set(out, tsc_str_from_lit("ffree", 5), tsc_value_num((double)st.f_ffree));
    return tsc_value_object(out);
}

tsc_fs_stats_t* tsc_fs_lstat_sync(const tsc_str_t* path) {
    char* p = cstr_dup(path);
    struct stat st;
    int r = lstat(p, &st);
    free(p);
    if (r != 0) {
        tsc_throw_str(tsc_str_from_cstr("fs.lstatSync: could not stat path"));
        return NULL;
    }
    tsc_fs_stats_t* out = (tsc_fs_stats_t*)TSC_GC_MALLOC(sizeof(tsc_fs_stats_t));
    fs_stats_fill(out, &st);
    return out;
}

tsc_fs_stats_t* tsc_fs_lstat_sync_no_throw(const tsc_str_t* path) {
    char* p = cstr_dup(path);
    struct stat st;
    int r = lstat(p, &st);
    int err = errno;
    free(p);
    if (r != 0) {
        if (err == ENOENT || err == ENOTDIR) return NULL;
        tsc_throw_str(tsc_str_from_cstr("fs.lstatSync: could not stat path"));
        return NULL;
    }
    tsc_fs_stats_t* out = (tsc_fs_stats_t*)TSC_GC_MALLOC(sizeof(tsc_fs_stats_t));
    fs_stats_fill(out, &st);
    return out;
}

#ifndef TSC_HAS_LIBUV
typedef struct {
    tsc_promise_t* promise;
    tsc_fs_stats_t* stats;
    tsc_str_t* error;
} tsc_fs_stats_async_task_t;

static void tsc_fs_stats_async_worker(void* env) {
    tsc_fs_stats_async_task_t* task = (tsc_fs_stats_async_task_t*)env;
    if (task->error) {
        tsc_promise_reject_in_place(task->promise, tsc_value_string(task->error));
    } else {
        tsc_promise_fulfill_in_place_ptr(task->promise, task->stats);
    }
}

static tsc_promise_t* tsc_fs_promises_stats_async(const tsc_str_t* path, bool throw_if_no_entry, bool lstat) {
    tsc_promise_t* promise = tsc_promise_pending();
    tsc_fs_stats_async_task_t* task = (tsc_fs_stats_async_task_t*)TSC_GC_MALLOC(sizeof(tsc_fs_stats_async_task_t));
    task->promise = promise;
    task->stats = NULL;
    task->error = NULL;

    tsc_try_frame_t frame;
    tsc_try_push(&frame);
    if (setjmp(frame.jb) == 0) {
        task->stats = lstat
            ? (throw_if_no_entry ? tsc_fs_lstat_sync(path) : tsc_fs_lstat_sync_no_throw(path))
            : (throw_if_no_entry ? tsc_fs_stat_sync(path) : tsc_fs_stat_sync_no_throw(path));
        tsc_try_pop();
    } else {
        task->error = tsc_current_error();
    }
    tsc_set_immediate(tsc_fs_stats_async_worker, task);
    return promise;
}

tsc_promise_t* tsc_fs_promises_stat_async(const tsc_str_t* path, bool throw_if_no_entry) {
    return tsc_fs_promises_stats_async(path, throw_if_no_entry, false);
}

tsc_promise_t* tsc_fs_promises_lstat_async(const tsc_str_t* path, bool throw_if_no_entry) {
    return tsc_fs_promises_stats_async(path, throw_if_no_entry, true);
}
#endif

tsc_str_t* tsc_fs_realpath_sync(const tsc_str_t* path) {
    char* p = cstr_dup(path);
    char* resolved = realpath(p, NULL);
    free(p);
    if (!resolved) {
        tsc_throw_str(tsc_str_from_cstr("fs.realpathSync: could not resolve path"));
        return NULL;
    }
    tsc_str_t* out = tsc_str_from_cstr(resolved);
    free(resolved);
    return out;
}

tsc_str_t* tsc_fs_readlink_sync(const tsc_str_t* path) {
    char* p = cstr_dup(path);
    size_t cap = PATH_MAX > 0 ? (size_t)PATH_MAX : 4096;
    for (;;) {
        char* buf = (char*)malloc(cap);
        ssize_t n = readlink(p, buf, cap);
        if (n < 0) {
            free(buf);
            free(p);
            tsc_throw_str(tsc_str_from_cstr("fs.readlinkSync: could not read link"));
            return NULL;
        }
        if ((size_t)n < cap) {
            tsc_str_t* out = str_alloc((size_t)n);
            memcpy((char*)out->data, buf, (size_t)n);
            free(buf);
            free(p);
            return out;
        }
        free(buf);
        if (cap >= (1u << 20)) {
            free(p);
            tsc_throw_str(tsc_str_from_cstr("fs.readlinkSync: link target too long"));
            return NULL;
        }
        cap *= 2;
    }
}

void tsc_fs_symlink_sync(const tsc_str_t* target, const tsc_str_t* path) {
    char* t = cstr_dup(target);
    char* p = cstr_dup(path);
    int r = symlink(t, p);
    free(t);
    free(p);
    if (r != 0) {
        tsc_throw_str(tsc_str_from_cstr("fs.symlinkSync: could not create link"));
    }
}

void tsc_fs_link_sync(const tsc_str_t* existing_path, const tsc_str_t* new_path) {
    char* oldp = cstr_dup(existing_path);
    char* newp = cstr_dup(new_path);
    int r = link(oldp, newp);
    free(oldp);
    free(newp);
    if (r != 0) {
        tsc_throw_str(tsc_str_from_cstr("fs.linkSync: could not create link"));
    }
}

tsc_str_t* tsc_fs_mkdtemp_sync(const tsc_str_t* prefix) {
    char* p = cstr_dup(prefix);
    size_t len = strlen(p);
    char* tmpl = (char*)malloc(len + 7);
    memcpy(tmpl, p, len);
    memcpy(tmpl + len, "XXXXXX", 7);
    free(p);
    char* made = mkdtemp(tmpl);
    if (!made) {
        free(tmpl);
        tsc_throw_str(tsc_str_from_cstr("fs.mkdtempSync: could not create directory"));
        return NULL;
    }
    tsc_str_t* out = tsc_str_from_cstr(made);
    free(tmpl);
    return out;
}

void tsc_fs_truncate_sync(const tsc_str_t* path, double len) {
    char* p = cstr_dup(path);
    off_t n = len < 0 ? 0 : (off_t)len;
    int r = truncate(p, n);
    free(p);
    if (r != 0) {
        tsc_throw_str(tsc_str_from_cstr("fs.truncateSync: could not truncate path"));
    }
}

struct timespec fs_seconds_to_timespec(double seconds) {
    if (isnan(seconds) || isinf(seconds)) seconds = 0.0;
    double whole = floor(seconds);
    double fraction = seconds - whole;
    long nsec = (long)floor((fraction * 1000000000.0) + 0.5);
    time_t sec = (time_t)whole;
    if (nsec >= 1000000000L) {
        sec += 1;
        nsec -= 1000000000L;
    }
    if (nsec < 0) {
        sec -= 1;
        nsec += 1000000000L;
    }
    struct timespec out;
    out.tv_sec = sec;
    out.tv_nsec = nsec;
    return out;
}

void fs_utimes_path_sync(const tsc_str_t* path, double atime, double mtime, int flags, const char* message) {
    char* p = cstr_dup(path);
    struct timespec times[2];
    times[0] = fs_seconds_to_timespec(atime);
    times[1] = fs_seconds_to_timespec(mtime);
    int r = utimensat(AT_FDCWD, p, times, flags);
    free(p);
    if (r != 0) {
        tsc_throw_str(tsc_str_from_cstr(message));
    }
}

void tsc_fs_utimes_sync(const tsc_str_t* path, double atime, double mtime) {
    fs_utimes_path_sync(path, atime, mtime, 0, "fs.utimesSync: could not update timestamps");
}

void tsc_fs_lutimes_sync(const tsc_str_t* path, double atime, double mtime) {
    fs_utimes_path_sync(path, atime, mtime, AT_SYMLINK_NOFOLLOW, "fs.lutimesSync: could not update symlink timestamps");
}

void tsc_fs_chown_sync(const tsc_str_t* path, double uid, double gid) {
    char* p = cstr_dup(path);
    int r = chown(p, (uid_t)uid, (gid_t)gid);
    free(p);
    if (r != 0) tsc_throw_str(tsc_str_from_cstr("fs.chownSync: could not change ownership"));
}

void tsc_fs_lchown_sync(const tsc_str_t* path, double uid, double gid) {
    char* p = cstr_dup(path);
    int r = lchown(p, (uid_t)uid, (gid_t)gid);
    free(p);
    if (r != 0) tsc_throw_str(tsc_str_from_cstr("fs.lchownSync: could not change ownership"));
}

double tsc_fs_stats_dev(const tsc_fs_stats_t* st) {
    return st ? st->dev : 0.0;
}

double tsc_fs_stats_ino(const tsc_fs_stats_t* st) {
    return st ? st->ino : 0.0;
}

double tsc_fs_stats_size(const tsc_fs_stats_t* st) {
    return st ? st->size : 0.0;
}

double tsc_fs_stats_mode(const tsc_fs_stats_t* st) {
    return st ? st->mode : 0.0;
}

double tsc_fs_stats_nlink(const tsc_fs_stats_t* st) {
    return st ? st->nlink : 0.0;
}

double tsc_fs_stats_uid(const tsc_fs_stats_t* st) {
    return st ? st->uid : 0.0;
}

double tsc_fs_stats_gid(const tsc_fs_stats_t* st) {
    return st ? st->gid : 0.0;
}

double tsc_fs_stats_rdev(const tsc_fs_stats_t* st) {
    return st ? st->rdev : 0.0;
}

double tsc_fs_stats_blksize(const tsc_fs_stats_t* st) {
    return st ? st->blksize : 0.0;
}

double tsc_fs_stats_blocks(const tsc_fs_stats_t* st) {
    return st ? st->blocks : 0.0;
}

double tsc_fs_stats_atime_ms(const tsc_fs_stats_t* st) {
    return st ? st->atime_ms : 0.0;
}

double tsc_fs_stats_mtime_ms(const tsc_fs_stats_t* st) {
    return st ? st->mtime_ms : 0.0;
}

double tsc_fs_stats_ctime_ms(const tsc_fs_stats_t* st) {
    return st ? st->ctime_ms : 0.0;
}

double tsc_fs_stats_birthtime_ms(const tsc_fs_stats_t* st) {
    return st ? st->birthtime_ms : 0.0;
}

bool tsc_fs_stats_is_file(const tsc_fs_stats_t* st) {
    return st ? st->is_file : false;
}

bool tsc_fs_stats_is_directory(const tsc_fs_stats_t* st) {
    return st ? st->is_directory : false;
}

bool tsc_fs_stats_is_symbolic_link(const tsc_fs_stats_t* st) {
    return st ? st->is_symbolic_link : false;
}

bool tsc_fs_stats_is_block_device(const tsc_fs_stats_t* st) {
    return st ? st->is_block_device : false;
}

bool tsc_fs_stats_is_character_device(const tsc_fs_stats_t* st) {
    return st ? st->is_character_device : false;
}

bool tsc_fs_stats_is_fifo(const tsc_fs_stats_t* st) {
    return st ? st->is_fifo : false;
}

bool tsc_fs_stats_is_socket(const tsc_fs_stats_t* st) {
    return st ? st->is_socket : false;
}

tsc_str_t* tsc_fs_dirent_name(const tsc_fs_dirent_t* ent) {
    return ent ? ent->name : tsc_str_from_lit("", 0);
}

bool tsc_fs_dirent_is_file(const tsc_fs_dirent_t* ent) {
    return ent ? ent->is_file : false;
}

bool tsc_fs_dirent_is_directory(const tsc_fs_dirent_t* ent) {
    return ent ? ent->is_directory : false;
}

bool tsc_fs_dirent_is_symbolic_link(const tsc_fs_dirent_t* ent) {
    return ent ? ent->is_symbolic_link : false;
}

bool tsc_fs_dirent_is_block_device(const tsc_fs_dirent_t* ent) {
    return ent ? ent->is_block_device : false;
}

bool tsc_fs_dirent_is_character_device(const tsc_fs_dirent_t* ent) {
    return ent ? ent->is_character_device : false;
}

bool tsc_fs_dirent_is_fifo(const tsc_fs_dirent_t* ent) {
    return ent ? ent->is_fifo : false;
}

bool tsc_fs_dirent_is_socket(const tsc_fs_dirent_t* ent) {
    return ent ? ent->is_socket : false;
}

void tsc_fs_access_sync(const tsc_str_t* path) {
    tsc_fs_access_sync_mode(path, (double)F_OK);
}

void tsc_fs_access_sync_mode(const tsc_str_t* path, double mode) {
    char* p = cstr_dup(path);
    int m = isnan(mode) ? F_OK : (int)mode;
    int r = access(p, m);
    free(p);
    if (r != 0) tsc_throw_str(tsc_str_from_cstr("fs.access: path is not accessible"));
}

void tsc_fs_chmod_sync(const tsc_str_t* path, double mode) {
    char* p = cstr_dup(path);
    mode_t m = mode < 0 ? 0 : (mode_t)mode;
    int r = chmod(p, m);
    free(p);
    if (r != 0) tsc_throw_str(tsc_str_from_cstr("fs.chmodSync: could not change mode"));
}

mode_t fs_mode_from_double(double mode) {
    if (isnan(mode) || isinf(mode) || mode < 0) return 0777;
    return (mode_t)mode;
}

void tsc_fs_mkdir_sync(const tsc_str_t* path) {
    tsc_fs_mkdir_sync_opts(path, false, 0777.0);
}

void fs_mkdir_one_sync(const tsc_str_t* path, mode_t mode, const char* message) {
    char* p = cstr_dup(path);
    int r = mkdir(p, mode);
    free(p);
    if (r != 0) tsc_throw_str(tsc_str_from_cstr(message));
}

int mkdir_recursive_cstr(const char* path, mode_t mode) {
    if (!path || path[0] == '\0') return -1;
    char* tmp = strdup(path);
    if (!tmp) return -1;
    size_t len = strlen(tmp);
    while (len > 1 && tmp[len - 1] == '/') {
        tmp[--len] = '\0';
    }
    for (char* p = tmp + 1; *p; p++) {
        if (*p != '/') continue;
        *p = '\0';
        if (tmp[0] != '\0' && mkdir(tmp, mode) != 0 && errno != EEXIST) {
            int saved = errno;
            free(tmp);
            errno = saved;
            return -1;
        }
        *p = '/';
    }
    if (mkdir(tmp, mode) != 0 && errno != EEXIST) {
        int saved = errno;
        free(tmp);
        errno = saved;
        return -1;
    }
    free(tmp);
    return 0;
}

void tsc_fs_mkdir_sync_opts(const tsc_str_t* path, bool recursive, double mode) {
    mode_t m = fs_mode_from_double(mode);
    if (!recursive) {
        fs_mkdir_one_sync(path, m, "fs.mkdirSync: could not create directory");
        return;
    }
    char* p = cstr_dup(path);
    int r = mkdir_recursive_cstr(p, m);
    free(p);
    if (r != 0) tsc_throw_str(tsc_str_from_cstr("fs.mkdirSync: could not create directory recursively"));
}

void tsc_fs_unlink_sync(const tsc_str_t* path) {
    char* p = cstr_dup(path);
    int r = unlink(p);
    free(p);
    if (r != 0) tsc_throw_str(tsc_str_from_cstr("fs.unlinkSync: could not remove file"));
}

void tsc_fs_rm_sync(const tsc_str_t* path) {
    char* p = cstr_dup(path);
    int r = remove(p);
    free(p);
    if (r != 0) tsc_throw_str(tsc_str_from_cstr("fs.rmSync: could not remove path"));
}

int rm_recursive_cstr(const char* path, bool force) {
    struct stat st;
    if (lstat(path, &st) != 0) {
        return (force && errno == ENOENT) ? 0 : -1;
    }
    if (!S_ISDIR(st.st_mode)) {
        return unlink(path);
    }
    DIR* d = opendir(path);
    if (!d) return -1;
    struct dirent* ent;
    while ((ent = readdir(d))) {
        if (strcmp(ent->d_name, ".") == 0 || strcmp(ent->d_name, "..") == 0) continue;
        size_t base_len = strlen(path);
        size_t name_len = strlen(ent->d_name);
        bool needs_slash = base_len > 0 && path[base_len - 1] != '/';
        char* child = (char*)malloc(base_len + (needs_slash ? 1 : 0) + name_len + 1);
        if (!child) {
            closedir(d);
            errno = ENOMEM;
            return -1;
        }
        memcpy(child, path, base_len);
        size_t pos = base_len;
        if (needs_slash) child[pos++] = '/';
        memcpy(child + pos, ent->d_name, name_len + 1);
        if (rm_recursive_cstr(child, force) != 0) {
            int saved = errno;
            free(child);
            closedir(d);
            errno = saved;
            return -1;
        }
        free(child);
    }
    closedir(d);
    return rmdir(path);
}

void tsc_fs_rm_sync_opts(const tsc_str_t* path, bool recursive, bool force) {
    char* p = cstr_dup(path);
    int r;
    if (recursive) {
        r = rm_recursive_cstr(p, force);
    } else {
        r = remove(p);
        if (r != 0 && force && errno == ENOENT) r = 0;
    }
    free(p);
    if (r != 0) tsc_throw_str(tsc_str_from_cstr("fs.rmSync: could not remove path"));
}

void tsc_fs_rmdir_sync(const tsc_str_t* path) {
    char* p = cstr_dup(path);
    int r = rmdir(p);
    free(p);
    if (r != 0) tsc_throw_str(tsc_str_from_cstr("fs.rmdirSync: could not remove directory"));
}

void tsc_fs_rmdir_sync_opts(const tsc_str_t* path, bool recursive) {
    char* p = cstr_dup(path);
    int r = recursive ? rm_recursive_cstr(p, false) : rmdir(p);
    free(p);
    if (r != 0) tsc_throw_str(tsc_str_from_cstr("fs.rmdirSync: could not remove directory"));
}

char* fs_join_path_cstr(const char* base, const char* name) {
    size_t base_len = strlen(base);
    size_t name_len = strlen(name);
    bool needs_slash = base_len > 0 && base[base_len - 1] != '/';
    char* out = (char*)malloc(base_len + (needs_slash ? 1 : 0) + name_len + 1);
    if (!out) return NULL;
    memcpy(out, base, base_len);
    size_t pos = base_len;
    if (needs_slash) out[pos++] = '/';
    memcpy(out + pos, name, name_len + 1);
    return out;
}

int fs_copy_file_bytes_cstr(const char* src, const char* dest, bool force, bool error_on_exist, int copy_flags, bool preserve_timestamps) {
    struct stat src_st;
    bool have_src_stat = preserve_timestamps && stat(src, &src_st) == 0;
    if (access(dest, F_OK) == 0) {
        if (copy_flags & 1) {
            errno = EEXIST;
            return -1;
        }
        if (!force && error_on_exist) {
            errno = EEXIST;
            return -1;
        }
        if (!force) return 0;
    }
    FILE* in = fopen(src, "rb");
    if (!in) return -1;
    FILE* out = fopen(dest, "wb");
    if (!out) {
        int saved = errno;
        fclose(in);
        errno = saved;
        return -1;
    }
    char buf[8192];
    int result = 0;
    for (;;) {
        size_t n = fread(buf, 1, sizeof(buf), in);
        if (n > 0 && fwrite(buf, 1, n, out) != n) {
            result = -1;
            break;
        }
        if (n < sizeof(buf)) {
            if (ferror(in)) result = -1;
            break;
        }
    }
    int saved = errno;
    if (fclose(out) != 0 && result == 0) {
        result = -1;
        saved = errno;
    }
    fclose(in);
    if (result == 0 && have_src_stat) {
        struct timespec times[2];
#if defined(__APPLE__)
        times[0] = src_st.st_atimespec;
        times[1] = src_st.st_mtimespec;
#else
        times[0] = src_st.st_atim;
        times[1] = src_st.st_mtim;
#endif
        if (utimensat(AT_FDCWD, dest, times, 0) != 0) {
            result = -1;
            saved = errno;
        }
    }
    if (result != 0) errno = saved;
    return result;
}

char* fs_readlink_alloc_cstr(const char* path) {
    size_t cap = PATH_MAX > 0 ? (size_t)PATH_MAX : 4096;
    for (;;) {
        char* buf = (char*)malloc(cap + 1);
        if (!buf) {
            errno = ENOMEM;
            return NULL;
        }
        ssize_t n = readlink(path, buf, cap);
        if (n < 0) {
            int saved = errno;
            free(buf);
            errno = saved;
            return NULL;
        }
        if ((size_t)n < cap) {
            buf[n] = '\0';
            return buf;
        }
        free(buf);
        if (cap >= (1u << 20)) {
            errno = ENAMETOOLONG;
            return NULL;
        }
        cap *= 2;
    }
}

int fs_copy_symlink_cstr(const char* src, const char* dest, bool force, bool error_on_exist, bool verbatim_symlinks) {
    struct stat dest_st;
    if (lstat(dest, &dest_st) == 0) {
        if (!force && error_on_exist) {
            errno = EEXIST;
            return -1;
        }
        if (!force) return 0;
        if (unlink(dest) != 0) return -1;
    } else if (errno != ENOENT) {
        return -1;
    }
    char* target = verbatim_symlinks ? fs_readlink_alloc_cstr(src) : realpath(src, NULL);
    if (!target) return -1;
    int r = symlink(target, dest);
    int saved = errno;
    free(target);
    if (r != 0) errno = saved;
    return r;
}

int fs_cp_recursive_cstr(const char* src, const char* dest, bool recursive, bool force, bool error_on_exist, bool dereference, bool verbatim_symlinks, int copy_flags, bool preserve_timestamps) {
    struct stat st;
    if ((dereference ? stat(src, &st) : lstat(src, &st)) != 0) return -1;
    if (!dereference && S_ISLNK(st.st_mode)) {
        return fs_copy_symlink_cstr(src, dest, force, error_on_exist, verbatim_symlinks);
    }
    if (S_ISDIR(st.st_mode)) {
        if (!recursive) {
            errno = EISDIR;
            return -1;
        }
        struct stat dest_st;
        if (lstat(dest, &dest_st) == 0) {
            if (!S_ISDIR(dest_st.st_mode)) {
                errno = ENOTDIR;
                return -1;
            }
        } else if (errno == ENOENT) {
            if (mkdir(dest, st.st_mode & 0777) != 0) return -1;
        } else {
            return -1;
        }
        DIR* d = opendir(src);
        if (!d) return -1;
        struct dirent* ent;
        while ((ent = readdir(d)) != NULL) {
            if (strcmp(ent->d_name, ".") == 0 || strcmp(ent->d_name, "..") == 0) continue;
            char* child_src = fs_join_path_cstr(src, ent->d_name);
            char* child_dest = fs_join_path_cstr(dest, ent->d_name);
            if (!child_src || !child_dest) {
                free(child_src);
                free(child_dest);
                closedir(d);
                errno = ENOMEM;
                return -1;
            }
            if (fs_cp_recursive_cstr(child_src, child_dest, recursive, force, error_on_exist, dereference, verbatim_symlinks, copy_flags, preserve_timestamps) != 0) {
                int saved = errno;
                free(child_src);
                free(child_dest);
                closedir(d);
                errno = saved;
                return -1;
            }
            free(child_src);
            free(child_dest);
        }
        closedir(d);
        return 0;
    }
    if (S_ISREG(st.st_mode)) {
        return fs_copy_file_bytes_cstr(src, dest, force, error_on_exist, copy_flags, preserve_timestamps);
    }
    errno = EINVAL;
    return -1;
}

void tsc_fs_cp_sync_opts(const tsc_str_t* src, const tsc_str_t* dest, bool recursive, bool force, bool error_on_exist, bool dereference, bool verbatim_symlinks, double mode, bool preserve_timestamps) {
    char* s = cstr_dup(src);
    char* d = cstr_dup(dest);
    int flags = (isnan(mode) || isinf(mode)) ? 0 : (int)mode;
    int r = fs_cp_recursive_cstr(s, d, recursive, force, error_on_exist, dereference, verbatim_symlinks, flags, preserve_timestamps);
    free(s);
    free(d);
    if (r != 0) tsc_throw_str(tsc_str_from_cstr("fs.cpSync: could not copy path"));
}

void tsc_fs_copy_file_sync_mode(const tsc_str_t* src, const tsc_str_t* dest, double mode) {
    char* dest_path = cstr_dup(dest);
    int flags = (isnan(mode) || isinf(mode)) ? 0 : (int)mode;
    if ((flags & 1) && access(dest_path, F_OK) == 0) {
        free(dest_path);
        tsc_throw_str(tsc_str_from_cstr("fs.copyFileSync: destination already exists"));
    }
    free(dest_path);
    tsc_str_t* data = tsc_fs_read_file_sync(src);
    if (!data) return;
    tsc_fs_write_file_sync(dest, data);
}

void tsc_fs_copy_file_sync(const tsc_str_t* src, const tsc_str_t* dest) {
    tsc_fs_copy_file_sync_mode(src, dest, 0.0);
}

void tsc_fs_rename_sync(const tsc_str_t* old_path, const tsc_str_t* new_path) {
    char* oldp = cstr_dup(old_path);
    char* newp = cstr_dup(new_path);
    int r = rename(oldp, newp);
    free(oldp);
    free(newp);
    if (r != 0) tsc_throw_str(tsc_str_from_cstr("fs.renameSync: could not rename path"));
}

tsc_array_t* tsc_fs_readdir_sync(const tsc_str_t* path) {
    char* p = cstr_dup(path);
    DIR* d = opendir(p);
    free(p);
    if (!d) {
        tsc_throw_str(tsc_str_from_cstr("fs.readdirSync: could not open dir"));
        return NULL;
    }
    tsc_array_t* a = tsc_array_new(sizeof(tsc_str_t*), 16);
    struct dirent* ent;
    while ((ent = readdir(d))) {
        if (strcmp(ent->d_name, ".") == 0 || strcmp(ent->d_name, "..") == 0) continue;
        tsc_str_t* s = tsc_str_from_cstr(ent->d_name);
        tsc_array_push_raw(a, &s);
    }
    closedir(d);
    return a;
}

tsc_array_t* tsc_fs_readdir_buffer_sync(const tsc_str_t* path) {
    char* p = cstr_dup(path);
    DIR* d = opendir(p);
    free(p);
    if (!d) {
        tsc_throw_str(tsc_str_from_cstr("fs.readdirSync: could not open dir"));
        return NULL;
    }
    tsc_array_t* a = tsc_array_new(sizeof(tsc_buffer_t*), 16);
    struct dirent* ent;
    while ((ent = readdir(d))) {
        if (strcmp(ent->d_name, ".") == 0 || strcmp(ent->d_name, "..") == 0) continue;
        tsc_str_t* s = tsc_str_from_cstr(ent->d_name);
        tsc_buffer_t* b = tsc_buffer_from_str(s, NULL);
        tsc_array_push_raw(a, &b);
    }
    closedir(d);
    return a;
}

void fs_readdir_recursive_into(const char* root, const char* rel, tsc_array_t* out) {
    char* dir_path = rel[0] == '\0' ? strdup(root) : fs_join_path(root, rel);
    DIR* d = opendir(dir_path);
    if (!d) {
        free(dir_path);
        tsc_throw_str(tsc_str_from_cstr("fs.readdirSync: could not open dir"));
        return;
    }
    struct dirent* ent;
    while ((ent = readdir(d))) {
        if (strcmp(ent->d_name, ".") == 0 || strcmp(ent->d_name, "..") == 0) continue;
        char* child_rel = rel[0] == '\0' ? strdup(ent->d_name) : fs_join_path(rel, ent->d_name);
        tsc_str_t* child_name = tsc_str_from_cstr(child_rel);
        tsc_array_push_raw(out, &child_name);

        char* child_path = fs_join_path(root, child_rel);
        struct stat st;
        bool descend = lstat(child_path, &st) == 0 && S_ISDIR(st.st_mode);
        free(child_path);
        if (descend) fs_readdir_recursive_into(root, child_rel, out);
        free(child_rel);
    }
    closedir(d);
    free(dir_path);
}

void fs_readdir_recursive_buffer_into(const char* root, const char* rel, tsc_array_t* out) {
    char* dir_path = rel[0] == '\0' ? strdup(root) : fs_join_path(root, rel);
    DIR* d = opendir(dir_path);
    if (!d) {
        free(dir_path);
        tsc_throw_str(tsc_str_from_cstr("fs.readdirSync: could not open dir"));
        return;
    }
    struct dirent* ent;
    while ((ent = readdir(d))) {
        if (strcmp(ent->d_name, ".") == 0 || strcmp(ent->d_name, "..") == 0) continue;
        char* child_rel = rel[0] == '\0' ? strdup(ent->d_name) : fs_join_path(rel, ent->d_name);
        tsc_str_t* child_name = tsc_str_from_cstr(child_rel);
        tsc_buffer_t* child_buf = tsc_buffer_from_str(child_name, NULL);
        tsc_array_push_raw(out, &child_buf);

        char* child_path = fs_join_path(root, child_rel);
        struct stat st;
        bool descend = lstat(child_path, &st) == 0 && S_ISDIR(st.st_mode);
        free(child_path);
        if (descend) fs_readdir_recursive_buffer_into(root, child_rel, out);
        free(child_rel);
    }
    closedir(d);
    free(dir_path);
}

void fs_readdir_recursive_dirents_into(const char* root, const char* rel, tsc_array_t* out) {
    char* dir_path = rel[0] == '\0' ? strdup(root) : fs_join_path(root, rel);
    DIR* d = opendir(dir_path);
    if (!d) {
        free(dir_path);
        tsc_throw_str(tsc_str_from_cstr("fs.readdirSync: could not open dir"));
        return;
    }
    struct dirent* ent;
    while ((ent = readdir(d))) {
        if (strcmp(ent->d_name, ".") == 0 || strcmp(ent->d_name, "..") == 0) continue;
        tsc_fs_dirent_t* dirent = fs_dirent_from_path(dir_path, ent->d_name);
        tsc_array_push_raw(out, &dirent);

        char* child_rel = rel[0] == '\0' ? strdup(ent->d_name) : fs_join_path(rel, ent->d_name);
        char* child_path = fs_join_path(root, child_rel);
        struct stat st;
        bool descend = lstat(child_path, &st) == 0 && S_ISDIR(st.st_mode);
        free(child_path);
        if (descend) fs_readdir_recursive_dirents_into(root, child_rel, out);
        free(child_rel);
    }
    closedir(d);
    free(dir_path);
}

tsc_array_t* tsc_fs_readdir_recursive_sync(const tsc_str_t* path) {
    char* p = cstr_dup(path);
    DIR* d = opendir(p);
    if (!d) {
        free(p);
        tsc_throw_str(tsc_str_from_cstr("fs.readdirSync: could not open dir"));
        return NULL;
    }
    closedir(d);
    tsc_array_t* a = tsc_array_new(sizeof(tsc_str_t*), 16);
    fs_readdir_recursive_into(p, "", a);
    free(p);
    return a;
}

tsc_array_t* tsc_fs_readdir_recursive_buffer_sync(const tsc_str_t* path) {
    char* p = cstr_dup(path);
    DIR* d = opendir(p);
    if (!d) {
        free(p);
        tsc_throw_str(tsc_str_from_cstr("fs.readdirSync: could not open dir"));
        return NULL;
    }
    closedir(d);
    tsc_array_t* a = tsc_array_new(sizeof(tsc_buffer_t*), 16);
    fs_readdir_recursive_buffer_into(p, "", a);
    free(p);
    return a;
}

tsc_array_t* tsc_fs_readdir_recursive_dirents_sync(const tsc_str_t* path) {
    char* p = cstr_dup(path);
    DIR* d = opendir(p);
    if (!d) {
        free(p);
        tsc_throw_str(tsc_str_from_cstr("fs.readdirSync: could not open dir"));
        return NULL;
    }
    closedir(d);
    tsc_array_t* a = tsc_array_new(sizeof(tsc_fs_dirent_t*), 16);
    fs_readdir_recursive_dirents_into(p, "", a);
    free(p);
    return a;
}

tsc_array_t* tsc_fs_readdir_dirents_sync(const tsc_str_t* path) {
    char* p = cstr_dup(path);
    DIR* d = opendir(p);
    if (!d) {
        free(p);
        tsc_throw_str(tsc_str_from_cstr("fs.readdirSync: could not open dir"));
        return NULL;
    }
    tsc_array_t* a = tsc_array_new(sizeof(tsc_fs_dirent_t*), 16);
    struct dirent* ent;
    while ((ent = readdir(d))) {
        if (strcmp(ent->d_name, ".") == 0 || strcmp(ent->d_name, "..") == 0) continue;
        tsc_fs_dirent_t* dirent = fs_dirent_from_path(p, ent->d_name);
        tsc_array_push_raw(a, &dirent);
    }
    closedir(d);
    free(p);
    return a;
}

tsc_array_t* tsc_fs_dirents_encode_names(tsc_array_t* entries, const tsc_str_t* encoding) {
    if (!entries || !encoding) return entries;
    for (size_t i = 0; i < entries->len; i++) {
        tsc_fs_dirent_t* ent = TSC_ARR(tsc_fs_dirent_t*, entries, i);
        if (!ent || !ent->name) continue;
        ent->name = tsc_buffer_to_string(tsc_buffer_from_str(ent->name, NULL), encoding);
    }
    return entries;
}

/* ---------------- path ---------------- */

tsc_str_t* path_join_impl(size_t n, va_list ap, bool resolve) {
    /* Simple POSIX join: concatenate with '/' separators, collapse duplicates. */
    char buf[4096];
    size_t pos = 0;
    if (resolve) {
        char cwd[PATH_MAX];
        if (getcwd(cwd, sizeof cwd)) {
            size_t l = strlen(cwd);
            if (l < sizeof buf) { memcpy(buf, cwd, l); pos = l; }
        }
    }
    for (size_t i = 0; i < n; i++) {
        tsc_str_t* s = va_arg(ap, tsc_str_t*);
        if (!s || s->len == 0) continue;
        bool s_abs = s->data[0] == '/';
        if (resolve && s_abs) { pos = 0; }
        if (pos > 0 && buf[pos - 1] != '/' && (!s_abs || !resolve)) {
            if (pos + 1 >= sizeof buf) break;
            buf[pos++] = '/';
        }
        size_t start = (pos > 0 && s->data[0] == '/') ? 1 : 0;
        if (pos + (s->len - start) >= sizeof buf) break;
        memcpy(buf + pos, s->data + start, s->len - start);
        pos += s->len - start;
    }
    if (pos == 0) { buf[0] = '.'; pos = 1; }
    tsc_str_t* r = str_alloc(pos);
    memcpy((char*)r->data, buf, pos);
    return r;
}

tsc_str_t* tsc_path_join(size_t n, ...) {
    va_list ap; va_start(ap, n);
    tsc_str_t* r = path_join_impl(n, ap, false);
    va_end(ap);
    return r;
}

tsc_str_t* tsc_path_resolve(size_t n, ...) {
    va_list ap; va_start(ap, n);
    tsc_str_t* r = path_join_impl(n, ap, true);
    va_end(ap);
    return r;
}

bool tsc_path_is_absolute(const tsc_str_t* p) {
    return p && p->len > 0 && p->data[0] == '/';
}

tsc_str_t* tsc_path_normalize(const tsc_str_t* p) {
    if (!p || p->len == 0) return tsc_str_from_lit(".", 1);
    bool absolute = tsc_path_is_absolute(p);
    bool trailing_slash = p->len > 1 && p->data[p->len - 1] == '/';
    char buf[4096];
    size_t pos = absolute ? 1 : 0;
    if (absolute) buf[0] = '/';
    size_t starts[256];
    bool parents[256];
    size_t top = 0;
    bool last_normal = false;

    for (size_t i = 0; i <= p->len;) {
        while (i < p->len && p->data[i] == '/') i++;
        size_t start = i;
        while (i < p->len && p->data[i] != '/') i++;
        size_t len = i - start;
        if (len == 0) break;
        if (len == 1 && p->data[start] == '.') {
            last_normal = false;
            continue;
        }
        if (len == 2 && p->data[start] == '.' && p->data[start + 1] == '.') {
            if (top > 0 && !parents[top - 1]) {
                pos = starts[--top];
            } else if (!absolute) {
                size_t prev = pos;
                if (pos > 0) {
                    if (pos + 1 >= sizeof buf) break;
                    buf[pos++] = '/';
                }
                if (pos + 2 >= sizeof buf) break;
                starts[top] = prev;
                parents[top] = true;
                top++;
                memcpy(buf + pos, "..", 2);
                pos += 2;
            }
            last_normal = false;
            continue;
        }

        if (top >= 256) break;
        size_t prev = pos;
        if (pos > 0 && !(absolute && pos == 1)) {
            if (pos + 1 >= sizeof buf) break;
            buf[pos++] = '/';
        }
        if (pos + len >= sizeof buf) break;
        starts[top] = prev;
        parents[top] = false;
        top++;
        memcpy(buf + pos, p->data + start, len);
        pos += len;
        last_normal = true;
    }

    if (pos == 0) {
        buf[pos++] = '.';
    }
    if (trailing_slash && last_normal && !(absolute && pos == 1)) {
        if (pos + 1 < sizeof buf && buf[pos - 1] != '/') buf[pos++] = '/';
    }
    tsc_str_t* r = str_alloc(pos);
    memcpy((char*)r->data, buf, pos);
    return r;
}

size_t path_split_components(const tsc_str_t* p, size_t starts[256], size_t lens[256]) {
    size_t count = 0;
    for (size_t i = 0; i < p->len && count < 256;) {
        while (i < p->len && p->data[i] == '/') i++;
        size_t start = i;
        while (i < p->len && p->data[i] != '/') i++;
        size_t len = i - start;
        if (len == 0) break;
        if (len == 1 && p->data[start] == '.') continue;
        starts[count] = start;
        lens[count] = len;
        count++;
    }
    return count;
}

tsc_str_t* tsc_path_relative(const tsc_str_t* from, const tsc_str_t* to) {
    tsc_str_t* from_norm = tsc_path_normalize(from);
    tsc_str_t* to_norm = tsc_path_normalize(to);
    if (from_norm->len == to_norm->len && memcmp(from_norm->data, to_norm->data, from_norm->len) == 0) {
        return tsc_str_from_lit("", 0);
    }
    if (tsc_path_is_absolute(from_norm) != tsc_path_is_absolute(to_norm)) {
        return to_norm;
    }

    size_t from_starts[256], from_lens[256], to_starts[256], to_lens[256];
    size_t from_count = path_split_components(from_norm, from_starts, from_lens);
    size_t to_count = path_split_components(to_norm, to_starts, to_lens);
    size_t common = 0;
    while (
        common < from_count &&
        common < to_count &&
        from_lens[common] == to_lens[common] &&
        memcmp(from_norm->data + from_starts[common], to_norm->data + to_starts[common], from_lens[common]) == 0
    ) {
        common++;
    }

    char buf[4096];
    size_t pos = 0;
    for (size_t i = common; i < from_count; i++) {
        if (pos > 0) {
            if (pos + 1 >= sizeof buf) break;
            buf[pos++] = '/';
        }
        if (pos + 2 >= sizeof buf) break;
        memcpy(buf + pos, "..", 2);
        pos += 2;
    }
    for (size_t i = common; i < to_count; i++) {
        if (pos > 0) {
            if (pos + 1 >= sizeof buf) break;
            buf[pos++] = '/';
        }
        if (pos + to_lens[i] >= sizeof buf) break;
        memcpy(buf + pos, to_norm->data + to_starts[i], to_lens[i]);
        pos += to_lens[i];
    }
    tsc_str_t* r = str_alloc(pos);
    memcpy((char*)r->data, buf, pos);
    return r;
}

static bool glob_match_inner(const char* path, size_t path_len, const char* pattern, size_t pattern_len) {
    size_t i = 0, j = 0;
    while (i < path_len && j < pattern_len) {
        if (pattern[j] == '*') {
            while (j < pattern_len && pattern[j] == '*') {
                j++;
            }
            if (j == pattern_len) {
                for (size_t k = i; k < path_len; k++) {
                    if (path[k] == '/') return false;
                }
                return true;
            }
            for (size_t k = i; k <= path_len; k++) {
                if (k > i && path[k - 1] == '/') {
                    break;
                }
                if (glob_match_inner(path + k, path_len - k, pattern + j, pattern_len - j)) {
                    return true;
                }
            }
            return false;
        } else if (pattern[j] == '?') {
            if (path[i] == '/') {
                return false;
            }
            i++;
            j++;
        } else {
            if (path[i] != pattern[j]) {
                return false;
            }
            i++;
            j++;
        }
    }
    if (i == path_len && j == pattern_len) {
        return true;
    }
    while (j < pattern_len && pattern[j] == '*') {
        j++;
    }
    return i == path_len && j == pattern_len;
}

bool tsc_path_matches_glob(const tsc_str_t* path, const tsc_str_t* pattern) {
    if (!path || !pattern) return false;
    return glob_match_inner(path->data, path->len, pattern->data, pattern->len);
}

tsc_str_t* tsc_path_basename(const tsc_str_t* p) {
    if (p->len == 0) return tsc_str_from_lit("", 0);
    size_t end = p->len;
    while (end > 0 && p->data[end - 1] == '/') end--;
    size_t start = end;
    while (start > 0 && p->data[start - 1] != '/') start--;
    tsc_str_t* r = str_alloc(end - start);
    memcpy((char*)r->data, p->data + start, end - start);
    return r;
}

tsc_str_t* tsc_path_basename_suffix(const tsc_str_t* p, const tsc_str_t* suffix) {
    tsc_str_t* base = tsc_path_basename(p);
    if (!suffix || suffix->len == 0 || suffix->len > base->len) return base;
    size_t start = base->len - suffix->len;
    if (memcmp(base->data + start, suffix->data, suffix->len) != 0) return base;
    tsc_str_t* r = str_alloc(start);
    memcpy((char*)r->data, base->data, start);
    return r;
}

tsc_str_t* tsc_path_dirname(const tsc_str_t* p) {
    if (p->len == 0) return tsc_str_from_lit(".", 1);
    size_t end = p->len;
    while (end > 1 && p->data[end - 1] == '/') end--;
    size_t slash = end;
    while (slash > 0 && p->data[slash - 1] != '/') slash--;
    if (slash == 0) return tsc_str_from_lit(".", 1);
    while (slash > 1 && p->data[slash - 1] == '/') slash--;
    tsc_str_t* r = str_alloc(slash);
    memcpy((char*)r->data, p->data, slash);
    return r;
}

static bool is_slash(char c) {
    return c == '/' || c == '\\';
}

static bool is_drive_letter(char c) {
    return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z');
}

static size_t get_win32_root_len(const char* data, size_t len) {
    if (len == 0) return 0;
    if (len >= 2 && is_slash(data[0]) && is_slash(data[1])) {
        size_t i = 2;
        while (i < len && !is_slash(data[i])) i++;
        if (i < len) {
            i++;
            while (i < len && !is_slash(data[i])) i++;
            if (i < len) {
                return i + 1;
            }
            return i;
        }
        return len;
    }
    if (len >= 2 && data[1] == ':' && is_drive_letter(data[0])) {
        if (len >= 3 && is_slash(data[2])) {
            return 3;
        }
        return 2;
    }
    if (is_slash(data[0])) {
        return 1;
    }
    return 0;
}

bool tsc_path_win32_is_absolute(const tsc_str_t* p) {
    if (!p || p->len == 0) return false;
    if (is_slash(p->data[0])) return true;
    if (p->len >= 2 && p->data[1] == ':' && is_drive_letter(p->data[0])) {
        if (p->len == 2 || is_slash(p->data[2])) return true;
    }
    return false;
}

tsc_str_t* tsc_path_win32_normalize(const tsc_str_t* p) {
    if (!p || p->len == 0) return tsc_str_from_lit(".", 1);
    size_t root_len = get_win32_root_len((const char*)p->data, p->len);

    char buf[4096];
    size_t pos = 0;

    for (size_t i = 0; i < root_len; i++) {
        buf[pos++] = is_slash(p->data[i]) ? '\\' : p->data[i];
    }

    bool root_is_abs = (root_len > 0 && buf[root_len - 1] == '\\');

    size_t starts[256];
    size_t lens[256];
    bool parents[256];
    size_t top = 0;

    bool trailing_slash = p->len > 0 && is_slash(p->data[p->len - 1]);
    bool last_normal = false;

    for (size_t i = root_len; i <= p->len;) {
        while (i < p->len && is_slash(p->data[i])) i++;
        size_t start = i;
        while (i < p->len && !is_slash(p->data[i])) i++;
        size_t len = i - start;
        if (len == 0) break;
        if (len == 1 && p->data[start] == '.') {
            last_normal = false;
            continue;
        }
        if (len == 2 && p->data[start] == '.' && p->data[start + 1] == '.') {
            if (top > 0 && !parents[top - 1]) {
                top--;
            } else if (!root_is_abs) {
                starts[top] = top > 0 ? starts[top - 1] + lens[top - 1] + 1 : 0;
                lens[top] = 2;
                parents[top] = true;
                top++;
            }
            last_normal = false;
            continue;
        }
        if (top >= 256) break;
        starts[top] = start;
        lens[top] = len;
        parents[top] = false;
        top++;
        last_normal = true;
    }

    for (size_t i = 0; i < top; i++) {
        if (pos > root_len) {
            if (pos + 1 >= sizeof buf) break;
            buf[pos++] = '\\';
        }
        if (pos + lens[i] >= sizeof buf) break;
        memcpy(buf + pos, p->data + starts[i], lens[i]);
        pos += lens[i];
    }

    if (pos == 0) {
        buf[pos++] = '.';
    }
    if (trailing_slash && last_normal && !(root_is_abs && pos == root_len)) {
        if (pos + 1 < sizeof buf && buf[pos - 1] != '\\') {
            buf[pos++] = '\\';
        }
    }
    tsc_str_t* r = str_alloc(pos);
    memcpy((char*)r->data, buf, pos);
    return r;
}

static tsc_str_t* path_win32_join_impl(size_t n, va_list ap, bool resolve) {
    char buf[8192];
    size_t pos = 0;
    if (resolve) {
        char cwd[PATH_MAX];
        if (getcwd(cwd, sizeof cwd)) {
            size_t l = strlen(cwd);
            if (l < sizeof buf) {
                for (size_t i = 0; i < l; i++) {
                    buf[pos++] = is_slash(cwd[i]) ? '\\' : cwd[i];
                }
            }
        }
    }
    for (size_t i = 0; i < n; i++) {
        tsc_str_t* s = va_arg(ap, tsc_str_t*);
        if (!s || s->len == 0) continue;

        bool s_abs = tsc_path_win32_is_absolute(s);
        if (resolve && s_abs) {
            pos = 0;
        }

        if (pos > 0 && buf[pos - 1] != '\\' && (!s_abs || !resolve)) {
            if (pos + 1 >= sizeof buf) break;
            buf[pos++] = '\\';
        }

        for (size_t j = 0; j < s->len; j++) {
            if (pos >= sizeof buf - 1) break;
            buf[pos++] = is_slash(s->data[j]) ? '\\' : s->data[j];
        }
    }

    tsc_str_t* temp = str_alloc(pos);
    memcpy((char*)temp->data, buf, pos);
    return tsc_path_win32_normalize(temp);
}

tsc_str_t* tsc_path_win32_join(size_t n, ...) {
    va_list ap; va_start(ap, n);
    tsc_str_t* r = path_win32_join_impl(n, ap, false);
    va_end(ap);
    return r;
}

tsc_str_t* tsc_path_win32_resolve(size_t n, ...) {
    va_list ap; va_start(ap, n);
    tsc_str_t* r = path_win32_join_impl(n, ap, true);
    va_end(ap);
    return r;
}

tsc_str_t* tsc_path_win32_basename(const tsc_str_t* p) {
    if (!p || p->len == 0) return tsc_str_from_lit("", 0);
    size_t root_len = get_win32_root_len((const char*)p->data, p->len);
    if (p->len == root_len) {
        if (root_len > 0 && p->data[root_len - 1] != ':' && p->data[root_len - 1] != '/' && p->data[root_len - 1] != '\\') {
            if (p->len >= 2 && is_slash(p->data[0]) && is_slash(p->data[1])) {
                return tsc_str_from_lit("", 0);
            }
        }
        if (root_len >= 2 && p->data[1] == ':' && is_drive_letter(p->data[0])) {
            if (root_len == 2) {
                tsc_str_t* r = str_alloc(2);
                memcpy((char*)r->data, p->data, 2);
                return r;
            }
        }
        return tsc_str_from_lit("", 0);
    }
    size_t end = p->len;
    while (end > root_len && is_slash(p->data[end - 1])) end--;
    size_t start = end;
    while (start > root_len && !is_slash(p->data[start - 1])) start--;
    tsc_str_t* r = str_alloc(end - start);
    memcpy((char*)r->data, p->data + start, end - start);
    return r;
}

tsc_str_t* tsc_path_win32_basename_suffix(const tsc_str_t* p, const tsc_str_t* suffix) {
    tsc_str_t* base = tsc_path_win32_basename(p);
    if (!suffix || suffix->len == 0 || suffix->len > base->len) return base;
    size_t start = base->len - suffix->len;
    if (memcmp(base->data + start, suffix->data, suffix->len) != 0) return base;
    tsc_str_t* r = str_alloc(start);
    memcpy((char*)r->data, base->data, start);
    return r;
}

tsc_str_t* tsc_path_win32_dirname(const tsc_str_t* p) {
    if (!p || p->len == 0) return tsc_str_from_lit(".", 1);
    size_t root_len = get_win32_root_len((const char*)p->data, p->len);
    if (p->len <= root_len) {
        tsc_str_t* r = str_alloc(p->len);
        memcpy((char*)r->data, p->data, p->len);
        return r;
    }
    size_t end = p->len;
    while (end > root_len && is_slash(p->data[end - 1])) end--;
    size_t slash = end;
    while (slash > root_len && !is_slash(p->data[slash - 1])) slash--;
    if (slash == root_len) {
        if (root_len > 0) {
            tsc_str_t* r = str_alloc(root_len);
            memcpy((char*)r->data, p->data, root_len);
            return r;
        }
        return tsc_str_from_lit(".", 1);
    }
    size_t dir_end = slash - 1;
    while (dir_end > root_len && is_slash(p->data[dir_end - 1])) dir_end--;
    tsc_str_t* r = str_alloc(dir_end);
    memcpy((char*)r->data, p->data, dir_end);
    return r;
}

tsc_str_t* tsc_path_win32_extname(const tsc_str_t* p) {
    if (!p || p->len == 0) return tsc_str_from_lit("", 0);
    for (size_t i = p->len; i > 0; i--) {
        char c = p->data[i - 1];
        if (is_slash(c) || c == ':') break;
        if (c == '.') {
            if (i == 1 || is_slash(p->data[i - 2]) || p->data[i - 2] == ':') return tsc_str_from_lit("", 0);
            tsc_str_t* r = str_alloc(p->len - (i - 1));
            memcpy((char*)r->data, p->data + (i - 1), p->len - (i - 1));
            return r;
        }
    }
    return tsc_str_from_lit("", 0);
}

tsc_value_t tsc_path_win32_parse(const tsc_str_t* p) {
    tsc_object_t* out = tsc_object_new();
    if (!p) p = tsc_str_from_lit("", 0);
    size_t root_len = get_win32_root_len((const char*)p->data, p->len);
    tsc_str_t* root = path_str_slice(p, 0, root_len);
    for (size_t i = 0; i < root->len; i++) {
        if (is_slash(root->data[i])) ((char*)root->data)[i] = '\\';
    }
    tsc_str_t* dir = tsc_path_win32_dirname(p);
    if (str_lit_eq(dir, ".") && !tsc_path_win32_is_absolute(p)) dir = tsc_str_from_lit("", 0);
    for (size_t i = 0; i < dir->len; i++) {
        if (is_slash(dir->data[i])) ((char*)dir->data)[i] = '\\';
    }
    tsc_str_t* base = tsc_path_win32_basename(p);
    tsc_str_t* ext = tsc_path_win32_extname(base);
    size_t name_len = base->len >= ext->len ? base->len - ext->len : base->len;
    tsc_str_t* name = path_str_slice(base, 0, name_len);
    tsc_object_set(out, tsc_str_from_lit("root", 4), tsc_value_string(root));
    tsc_object_set(out, tsc_str_from_lit("dir", 3), tsc_value_string(dir));
    tsc_object_set(out, tsc_str_from_lit("base", 4), tsc_value_string(base));
    tsc_object_set(out, tsc_str_from_lit("ext", 3), tsc_value_string(ext));
    tsc_object_set(out, tsc_str_from_lit("name", 4), tsc_value_string(name));
    return tsc_value_object(out);
}

tsc_str_t* tsc_path_win32_format(tsc_value_t path_object) {
    tsc_str_t* root = path_get_string_prop(path_object, "root", 4);
    tsc_str_t* dir = path_get_string_prop(path_object, "dir", 3);
    tsc_str_t* base = path_get_string_prop(path_object, "base", 4);
    if (!base) {
        tsc_str_t* name = path_get_string_prop(path_object, "name", 4);
        tsc_str_t* ext = path_get_string_prop(path_object, "ext", 3);
        if (!name) name = tsc_str_from_lit("", 0);
        if (!ext) ext = tsc_str_from_lit("", 0);
        base = tsc_str_concat(name, ext);
    }
    if (!root) root = tsc_str_from_lit("", 0);
    if (!dir) dir = tsc_str_from_lit("", 0);
    if (dir->len > 0) {
        if (base->len == 0) return dir;
        if (dir->data[dir->len - 1] == '\\' || dir->data[dir->len - 1] == '/') return tsc_str_concat(dir, base);
        return tsc_str_concat_n(3, dir, tsc_str_from_lit("\\", 1), base);
    }
    if (root->len > 0) {
        if (base->len == 0) return root;
        if (root->data[root->len - 1] == '\\' || root->data[root->len - 1] == '/') return tsc_str_concat(root, base);
        return tsc_str_concat_n(3, root, tsc_str_from_lit("\\", 1), base);
    }
    return base;
}

static bool path_win32_eq_ci(const char* a, size_t a_len, const char* b, size_t b_len) {
    if (a_len != b_len) return false;
    for (size_t i = 0; i < a_len; i++) {
        char ca = a[i];
        char cb = b[i];
        if (ca >= 'A' && ca <= 'Z') ca = ca - 'A' + 'a';
        if (cb >= 'A' && cb <= 'Z') cb = cb - 'A' + 'a';
        if (ca == '/') ca = '\\';
        if (cb == '/') cb = '\\';
        if (ca != cb) return false;
    }
    return true;
}

static size_t path_win32_split_components_after(const tsc_str_t* p, size_t offset, size_t starts[256], size_t lens[256]) {
    size_t count = 0;
    for (size_t i = offset; i < p->len && count < 256;) {
        while (i < p->len && (p->data[i] == '/' || p->data[i] == '\\')) i++;
        size_t start = i;
        while (i < p->len && !(p->data[i] == '/' || p->data[i] == '\\')) i++;
        size_t len = i - start;
        if (len == 0) break;
        if (len == 1 && p->data[start] == '.') continue;
        starts[count] = start;
        lens[count] = len;
        count++;
    }
    return count;
}

tsc_str_t* tsc_path_win32_relative(const tsc_str_t* from, const tsc_str_t* to) {
    tsc_str_t* from_norm = tsc_path_win32_normalize(from);
    tsc_str_t* to_norm = tsc_path_win32_normalize(to);
    if (path_win32_eq_ci((const char*)from_norm->data, from_norm->len, (const char*)to_norm->data, to_norm->len)) {
        return tsc_str_from_lit("", 0);
    }
    size_t from_root_len = get_win32_root_len((const char*)from_norm->data, from_norm->len);
    size_t to_root_len = get_win32_root_len((const char*)to_norm->data, to_norm->len);
    if (!path_win32_eq_ci((const char*)from_norm->data, from_root_len, (const char*)to_norm->data, to_root_len)) {
        return to_norm;
    }

    size_t from_starts[256], from_lens[256], to_starts[256], to_lens[256];
    size_t from_count = path_win32_split_components_after(from_norm, from_root_len, from_starts, from_lens);
    size_t to_count = path_win32_split_components_after(to_norm, to_root_len, to_starts, to_lens);
    size_t common = 0;
    while (
        common < from_count &&
        common < to_count &&
        from_lens[common] == to_lens[common] &&
        path_win32_eq_ci((const char*)(from_norm->data + from_starts[common]), from_lens[common], (const char*)(to_norm->data + to_starts[common]), to_lens[common])
    ) {
        common++;
    }

    char buf[4096];
    size_t pos = 0;
    for (size_t i = common; i < from_count; i++) {
        if (pos > 0) {
            if (pos + 1 >= sizeof buf) break;
            buf[pos++] = '\\';
        }
        if (pos + 2 >= sizeof buf) break;
        memcpy(buf + pos, "..", 2);
        pos += 2;
    }
    for (size_t i = common; i < to_count; i++) {
        if (pos > 0) {
            if (pos + 1 >= sizeof buf) break;
            buf[pos++] = '\\';
        }
        if (pos + to_lens[i] >= sizeof buf) break;
        memcpy(buf + pos, to_norm->data + to_starts[i], to_lens[i]);
        pos += to_lens[i];
    }
    tsc_str_t* r = str_alloc(pos);
    memcpy((char*)r->data, buf, pos);
    return r;
}

static bool glob_win32_match_inner(const char* path, size_t path_len, const char* pattern, size_t pattern_len) {
    size_t i = 0, j = 0;
    while (i < path_len && j < pattern_len) {
        if (pattern[j] == '*') {
            while (j < pattern_len && pattern[j] == '*') {
                j++;
            }
            if (j == pattern_len) {
                for (size_t k = i; k < path_len; k++) {
                    if (path[k] == '/' || path[k] == '\\') return false;
                }
                return true;
            }
            for (size_t k = i; k <= path_len; k++) {
                if (k > i && (path[k - 1] == '/' || path[k - 1] == '\\')) {
                    break;
                }
                if (glob_win32_match_inner(path + k, path_len - k, pattern + j, pattern_len - j)) {
                    return true;
                }
            }
            return false;
        } else if (pattern[j] == '?') {
            if (path[i] == '/' || path[i] == '\\') {
                return false;
            }
            i++;
            j++;
        } else {
            char cp = path[i];
            char cpat = pattern[j];
            if (cp >= 'A' && cp <= 'Z') cp = cp - 'A' + 'a';
            if (cpat >= 'A' && cpat <= 'Z') cpat = cpat - 'A' + 'a';
            if (cp == '/') cp = '\\';
            if (cpat == '/') cpat = '\\';
            if (cp != cpat) {
                return false;
            }
            i++;
            j++;
        }
    }
    if (i == path_len && j == pattern_len) {
        return true;
    }
    while (j < pattern_len && pattern[j] == '*') {
        j++;
    }
    return i == path_len && j == pattern_len;
}

bool tsc_path_win32_matches_glob(const tsc_str_t* path, const tsc_str_t* pattern) {
    if (!path || !pattern) return false;
    return glob_win32_match_inner(path->data, path->len, pattern->data, pattern->len);
}

/* ---------------- os ---------------- */

tsc_str_t* tsc_os_platform(void) {
#if defined(__linux__)
    return tsc_str_from_lit("linux", 5);
#elif defined(__APPLE__)
    return tsc_str_from_lit("darwin", 6);
#elif defined(_WIN32)
    return tsc_str_from_lit("win32", 5);
#else
    return tsc_str_from_lit("unknown", 7);
#endif
}

tsc_str_t* tsc_os_type(void) {
#if defined(__linux__)
    return tsc_str_from_lit("Linux", 5);
#elif defined(__APPLE__)
    return tsc_str_from_lit("Darwin", 6);
#elif defined(_WIN32)
    return tsc_str_from_lit("Windows_NT", 10);
#else
    return tsc_str_from_lit("Unknown", 7);
#endif
}

tsc_str_t* tsc_os_release(void) {
    struct utsname u;
    if (uname(&u) == 0) {
        return tsc_str_from_cstr(u.release);
    }
    return tsc_str_from_lit("unknown", 7);
}

tsc_str_t* tsc_os_version(void) {
    struct utsname u;
    if (uname(&u) == 0) {
        return tsc_str_from_cstr(u.version);
    }
    return tsc_str_from_lit("unknown", 7);
}

tsc_str_t* tsc_os_endianness(void) {
    uint16_t value = 1;
    return (*(uint8_t*)&value) == 1 ? tsc_str_from_lit("LE", 2) : tsc_str_from_lit("BE", 2);
}

tsc_str_t* tsc_os_machine(void) {
    struct utsname u;
    if (uname(&u) == 0) {
        return tsc_str_from_cstr(u.machine);
    }
    return tsc_os_arch();
}

tsc_str_t* tsc_os_arch(void) {
#if defined(__x86_64__) || defined(_M_X64)
    return tsc_str_from_lit("x64", 3);
#elif defined(__aarch64__) || defined(_M_ARM64)
    return tsc_str_from_lit("arm64", 5);
#elif defined(__i386__) || defined(_M_IX86)
    return tsc_str_from_lit("ia32", 4);
#elif defined(__arm__)
    return tsc_str_from_lit("arm", 3);
#else
    return tsc_str_from_lit("unknown", 7);
#endif
}

tsc_str_t* tsc_os_hostname(void) {
    char buf[256];
    if (gethostname(buf, sizeof buf) == 0) {
        buf[sizeof buf - 1] = '\0';
        return tsc_str_from_cstr(buf);
    }
    return tsc_str_from_lit("unknown", 7);
}

tsc_str_t* tsc_os_tmpdir(void) {
    const char* t = getenv("TMPDIR");
    if (!t) t = "/tmp";
    return tsc_str_from_cstr(t);
}

tsc_str_t* tsc_os_homedir(void) {
    const char* h = getenv("HOME");
    if (!h) h = "/";
    return tsc_str_from_cstr(h);
}

double tsc_os_cpu_count(void) {
#if defined(_SC_NPROCESSORS_ONLN)
    long n = sysconf(_SC_NPROCESSORS_ONLN);
    if (n > 0) return (double)n;
#endif
    return 1.0;
}

double tsc_os_available_parallelism(void) {
    return tsc_os_cpu_count();
}

double tsc_os_totalmem(void) {
#if defined(__linux__)
    struct sysinfo info;
    if (sysinfo(&info) == 0) {
        return (double)info.totalram * (double)info.mem_unit;
    }
#elif defined(_SC_PHYS_PAGES) && defined(_SC_PAGESIZE)
    long pages = sysconf(_SC_PHYS_PAGES);
    long page_size = sysconf(_SC_PAGESIZE);
    if (pages > 0 && page_size > 0) {
        return (double)pages * (double)page_size;
    }
#endif
    return 0.0;
}

double tsc_os_freemem(void) {
#if defined(__linux__)
    struct sysinfo info;
    if (sysinfo(&info) == 0) {
        return (double)info.freeram * (double)info.mem_unit;
    }
#elif defined(_SC_AVPHYS_PAGES) && defined(_SC_PAGESIZE)
    long pages = sysconf(_SC_AVPHYS_PAGES);
    long page_size = sysconf(_SC_PAGESIZE);
    if (pages > 0 && page_size > 0) {
        return (double)pages * (double)page_size;
    }
#endif
    return 0.0;
}

double tsc_os_uptime(void) {
#if defined(__linux__)
    struct sysinfo info;
    if (sysinfo(&info) == 0) {
        return (double)info.uptime;
    }
#endif
    return 0.0;
}

tsc_array_t* tsc_os_loadavg(void) {
    double values[3] = { 0.0, 0.0, 0.0 };
#if defined(__linux__)
    struct sysinfo info;
    if (sysinfo(&info) == 0) {
        values[0] = (double)info.loads[0] / 65536.0;
        values[1] = (double)info.loads[1] / 65536.0;
        values[2] = (double)info.loads[2] / 65536.0;
    }
#endif
    tsc_array_t* a = tsc_array_new(sizeof(double), 3);
    for (size_t i = 0; i < 3; i++) {
        tsc_array_push_raw(a, &values[i]);
    }
    return a;
}

tsc_value_t tsc_os_user_info_opts(const tsc_str_t* encoding) {
    uid_t uid = getuid();
    gid_t gid = getgid();
    struct passwd* pw = getpwuid(uid);
    tsc_object_t* out = tsc_object_new();
    tsc_object_set(out, tsc_str_from_lit("uid", 3), tsc_value_num((double)uid));
    tsc_object_set(out, tsc_str_from_lit("gid", 3), tsc_value_num((double)gid));
    tsc_str_t* username = tsc_str_from_cstr(pw && pw->pw_name ? pw->pw_name : "");
    tsc_str_t* homedir = pw && pw->pw_dir ? tsc_str_from_cstr(pw->pw_dir) : tsc_os_homedir();
    tsc_str_t* shell = tsc_str_from_cstr(pw && pw->pw_shell ? pw->pw_shell : "");
    bool buffer_encoding = encoding && tsc_str_eq(encoding, tsc_str_from_lit("buffer", 6));
    if (buffer_encoding) {
        tsc_object_set(out, tsc_str_from_lit("username", 8), tsc_value_buffer(tsc_buffer_from_str(username, NULL)));
        tsc_object_set(out, tsc_str_from_lit("homedir", 7), tsc_value_buffer(tsc_buffer_from_str(homedir, NULL)));
        tsc_object_set(out, tsc_str_from_lit("shell", 5), tsc_value_buffer(tsc_buffer_from_str(shell, NULL)));
    } else {
        tsc_object_set(out, tsc_str_from_lit("username", 8), tsc_value_string(username));
        tsc_object_set(out, tsc_str_from_lit("homedir", 7), tsc_value_string(homedir));
        tsc_object_set(out, tsc_str_from_lit("shell", 5), tsc_value_string(shell));
    }
    return tsc_value_object(out);
}

tsc_value_t tsc_os_user_info(void) {
    return tsc_os_user_info_opts(NULL);
}

#if !defined(_WIN32)
#include <ifaddrs.h>
#include <net/if.h>
#if defined(__linux__)
#include <netpacket/packet.h>
#elif defined(__APPLE__)
#include <net/if_dl.h>
#endif

static int ipv4_netmask_to_prefix(struct in_addr mask) {
    uint32_t val = ntohl(mask.s_addr);
    int prefix = 0;
    while (val > 0) {
        if (val & 0x80000000) {
            prefix++;
            val <<= 1;
        } else {
            break;
        }
    }
    return prefix;
}

static int ipv6_netmask_to_prefix(const uint8_t mask[16]) {
    int prefix = 0;
    for (int i = 0; i < 16; i++) {
        uint8_t byte = mask[i];
        while (byte > 0) {
            if (byte & 0x80) {
                prefix++;
                byte <<= 1;
            } else {
                break;
            }
        }
        if (mask[i] != 255) {
            break;
        }
    }
    return prefix;
}

static void get_mac_address(struct ifaddrs* head, const char* ifa_name, char* mac_out) {
    strcpy(mac_out, "00:00:00:00:00:00");
    for (struct ifaddrs* ifa = head; ifa != NULL; ifa = ifa->ifa_next) {
        if (ifa->ifa_addr == NULL || ifa->ifa_name == NULL) continue;
        if (strcmp(ifa->ifa_name, ifa_name) != 0) continue;

#if defined(__linux__)
        if (ifa->ifa_addr->sa_family == AF_PACKET) {
            struct sockaddr_ll* sll = (struct sockaddr_ll*)ifa->ifa_addr;
            if (sll->sll_halen == 6) {
                snprintf(mac_out, 18, "%02x:%02x:%02x:%02x:%02x:%02x",
                        sll->sll_addr[0], sll->sll_addr[1], sll->sll_addr[2],
                        sll->sll_addr[3], sll->sll_addr[4], sll->sll_addr[5]);
                return;
            }
        }
#elif defined(__APPLE__)
        if (ifa->ifa_addr->sa_family == AF_LINK) {
            struct sockaddr_dl* sdl = (struct sockaddr_dl*)ifa->ifa_addr;
            if (sdl->sdl_alen == 6) {
                unsigned char* ptr = (unsigned char*)LLADDR(sdl);
                snprintf(mac_out, 18, "%02x:%02x:%02x:%02x:%02x:%02x",
                        ptr[0], ptr[1], ptr[2], ptr[3], ptr[4], ptr[5]);
                return;
            }
        }
#endif
    }
}
#endif

tsc_value_t tsc_os_network_interfaces(void) {
    tsc_object_t* out = tsc_object_new();
#if !defined(_WIN32)
    struct ifaddrs *ifaddr = NULL;
    if (getifaddrs(&ifaddr) == -1) {
        return tsc_value_object(out);
    }

    struct ifaddrs *ifa;
    for (ifa = ifaddr; ifa != NULL; ifa = ifa->ifa_next) {
        if (ifa->ifa_addr == NULL || ifa->ifa_name == NULL) {
            continue;
        }

        int family = ifa->ifa_addr->sa_family;
        if (family != AF_INET && family != AF_INET6) {
            continue;
        }

        // Get/create array for the interface name
        tsc_str_t* name_str = tsc_str_from_cstr(ifa->ifa_name);
        tsc_array_t* arr = NULL;
        if (tsc_object_has(out, name_str)) {
            tsc_value_t val = tsc_object_get(out, name_str);
            arr = tsc_value_as_array(val);
        } else {
            arr = tsc_array_new(sizeof(tsc_value_t), 0);
            tsc_object_set(out, name_str, tsc_value_array(arr));
        }

        // Create the record object
        tsc_object_t* record = tsc_object_new();

        // 1. address & netmask & family & cidr
        char ip_str[INET6_ADDRSTRLEN] = {0};
        char netmask_str[INET6_ADDRSTRLEN] = {0};
        int prefix = 0;

        if (family == AF_INET) {
            struct sockaddr_in* sa = (struct sockaddr_in*)ifa->ifa_addr;
            inet_ntop(AF_INET, &(sa->sin_addr), ip_str, INET_ADDRSTRLEN);

            tsc_object_set(record, tsc_str_from_lit("family", 6), tsc_value_string(tsc_str_from_lit("IPv4", 4)));
            tsc_object_set(record, tsc_str_from_lit("address", 7), tsc_value_string(tsc_str_from_cstr(ip_str)));

            if (ifa->ifa_netmask && ifa->ifa_netmask->sa_family == AF_INET) {
                struct sockaddr_in* nm = (struct sockaddr_in*)ifa->ifa_netmask;
                inet_ntop(AF_INET, &(nm->sin_addr), netmask_str, INET_ADDRSTRLEN);
                prefix = ipv4_netmask_to_prefix(nm->sin_addr);
            } else {
                strcpy(netmask_str, "0.0.0.0");
            }
            tsc_object_set(record, tsc_str_from_lit("netmask", 7), tsc_value_string(tsc_str_from_cstr(netmask_str)));

            char cidr_str[INET_ADDRSTRLEN + 8];
            snprintf(cidr_str, sizeof(cidr_str), "%s/%d", ip_str, prefix);
            tsc_object_set(record, tsc_str_from_lit("cidr", 4), tsc_value_string(tsc_str_from_cstr(cidr_str)));
        } else if (family == AF_INET6) {
            struct sockaddr_in6* sa6 = (struct sockaddr_in6*)ifa->ifa_addr;
            inet_ntop(AF_INET6, &(sa6->sin6_addr), ip_str, INET6_ADDRSTRLEN);

            tsc_object_set(record, tsc_str_from_lit("family", 6), tsc_value_string(tsc_str_from_lit("IPv6", 4)));
            tsc_object_set(record, tsc_str_from_lit("address", 7), tsc_value_string(tsc_str_from_cstr(ip_str)));

            if (ifa->ifa_netmask && ifa->ifa_netmask->sa_family == AF_INET6) {
                struct sockaddr_in6* nm6 = (struct sockaddr_in6*)ifa->ifa_netmask;
                inet_ntop(AF_INET6, &(nm6->sin6_addr), netmask_str, INET6_ADDRSTRLEN);
                prefix = ipv6_netmask_to_prefix((const uint8_t*)&(nm6->sin6_addr));
            } else {
                strcpy(netmask_str, "::");
            }
            tsc_object_set(record, tsc_str_from_lit("netmask", 7), tsc_value_string(tsc_str_from_cstr(netmask_str)));

            char cidr_str[INET6_ADDRSTRLEN + 8];
            snprintf(cidr_str, sizeof(cidr_str), "%s/%d", ip_str, prefix);
            tsc_object_set(record, tsc_str_from_lit("cidr", 4), tsc_value_string(tsc_str_from_cstr(cidr_str)));
        }

        // 2. internal
        bool internal = (ifa->ifa_flags & IFF_LOOPBACK) != 0;
        tsc_object_set(record, tsc_str_from_lit("internal", 8), tsc_value_bool(internal));

        // 3. mac
        char mac_str[18] = {0};
        get_mac_address(ifaddr, ifa->ifa_name, mac_str);
        tsc_object_set(record, tsc_str_from_lit("mac", 3), tsc_value_string(tsc_str_from_cstr(mac_str)));

        // Push record value to array
        tsc_value_t rec_val = tsc_value_object(record);
        tsc_array_push_raw(arr, &rec_val);
    }

    freeifaddrs(ifaddr);
#endif
    return tsc_value_object(out);
}

double tsc_os_get_priority(double pid_double) {
    id_t pid = (id_t)pid_double;
    errno = 0;
    int priority = getpriority(PRIO_PROCESS, pid);
    if (priority == -1 && errno != 0) {
        tsc_throw_str(tsc_str_from_cstr("os.getPriority: failed to get priority"));
    }
    return (double)priority;
}

void tsc_os_set_priority(double pid_double, double priority_double) {
    id_t pid = (id_t)pid_double;
    int priority = (int)priority_double;
    if (priority < -20 || priority > 19) {
        tsc_throw_str(tsc_str_from_cstr("os.setPriority: priority must be between -20 and 19"));
    }
    int res = setpriority(PRIO_PROCESS, pid, priority);
    if (res == -1) {
        tsc_throw_str(tsc_str_from_cstr("os.setPriority: failed to set priority"));
    }
}

double getPriority(double pid, tsc_array_t* ignore) {
    (void)ignore;
    return tsc_os_get_priority(pid);
}

void setPriority(double pid, double priority, tsc_array_t* ignore) {
    (void)ignore;
    tsc_os_set_priority(pid, priority);
}

double tsc_date_now(void) {
    struct timespec ts;
    if (clock_gettime(CLOCK_REALTIME, &ts) == 0) {
        return (double)ts.tv_sec * 1000.0 + (double)ts.tv_nsec / 1e6;
    }
    return 0.0;
}

tsc_date_t* tsc_date_new_now(void) {
    return tsc_date_from_ms(tsc_date_now());
}

tsc_date_t* tsc_date_from_ms(double ms) {
    tsc_date_t* d = (tsc_date_t*)TSC_GC_MALLOC(sizeof(tsc_date_t));
    d->ms = ms;
    return d;
}

double tsc_date_get_time(const tsc_date_t* d) {
    return d ? d->ms : NAN;
}

double tsc_date_set_time(tsc_date_t* d, double ms) {
    if (!d) return NAN;
    d->ms = ms;
    return ms;
}

double tsc_date_set_utc_part(tsc_date_t* d, int part, double a, double b, double c, double e, int arg_count) {
    if (!d) return NAN;
    double provided[] = { a, b, c, e };
    for (int i = 0; i < arg_count && i < 4; i++) {
        if (isnan(provided[i])) {
            d->ms = NAN;
            return NAN;
        }
    }
    if (isnan(d->ms) && part != 0) return NAN;
    double base_ms = isnan(d->ms) ? 0.0 : d->ms;
    double seconds_double = floor(base_ms / 1000.0);
    time_t seconds = (time_t)seconds_double;
    struct tm tm;
    if (!gmtime_r(&seconds, &tm)) {
        d->ms = NAN;
        return NAN;
    }
    double rem = fmod(base_ms, 1000.0);
    if (rem < 0) rem += 1000.0;
    int millis = (int)floor(rem);

    switch (part) {
        case 0:
            tm.tm_year = (int)a - 1900;
            if (arg_count > 1) tm.tm_mon = (int)b;
            if (arg_count > 2) tm.tm_mday = (int)c;
            break;
        case 1:
            tm.tm_mon = (int)a;
            if (arg_count > 1) tm.tm_mday = (int)b;
            break;
        case 2:
            tm.tm_mday = (int)a;
            break;
        case 3:
            tm.tm_hour = (int)a;
            if (arg_count > 1) tm.tm_min = (int)b;
            if (arg_count > 2) tm.tm_sec = (int)c;
            if (arg_count > 3) millis = (int)e;
            break;
        case 4:
            tm.tm_min = (int)a;
            if (arg_count > 1) tm.tm_sec = (int)b;
            if (arg_count > 2) millis = (int)c;
            break;
        case 5:
            tm.tm_sec = (int)a;
            if (arg_count > 1) millis = (int)b;
            break;
        case 6:
            millis = (int)a;
            break;
        default:
            return NAN;
    }

    time_t t = timegm(&tm);
    d->ms = ((double)t) * 1000.0 + (double)millis;
    return d->ms;
}

double tsc_date_set_local_part(tsc_date_t* d, int part, double a, double b, double c, double e, int arg_count) {
    if (!d) return NAN;
    double provided[] = { a, b, c, e };
    for (int i = 0; i < arg_count && i < 4; i++) {
        if (isnan(provided[i])) {
            d->ms = NAN;
            return NAN;
        }
    }
    if (isnan(d->ms) && part != 0) return NAN;
    double base_ms = isnan(d->ms) ? 0.0 : d->ms;
    double seconds_double = floor(base_ms / 1000.0);
    time_t seconds = (time_t)seconds_double;
    struct tm tm;
    if (!localtime_r(&seconds, &tm)) {
        d->ms = NAN;
        return NAN;
    }
    double rem = fmod(base_ms, 1000.0);
    if (rem < 0) rem += 1000.0;
    int millis = (int)floor(rem);

    switch (part) {
        case 0:
            tm.tm_year = (int)a - 1900;
            if (arg_count > 1) tm.tm_mon = (int)b;
            if (arg_count > 2) tm.tm_mday = (int)c;
            break;
        case 1:
            tm.tm_mon = (int)a;
            if (arg_count > 1) tm.tm_mday = (int)b;
            break;
        case 2:
            tm.tm_mday = (int)a;
            break;
        case 3:
            tm.tm_hour = (int)a;
            if (arg_count > 1) tm.tm_min = (int)b;
            if (arg_count > 2) tm.tm_sec = (int)c;
            if (arg_count > 3) millis = (int)e;
            break;
        case 4:
            tm.tm_min = (int)a;
            if (arg_count > 1) tm.tm_sec = (int)b;
            if (arg_count > 2) millis = (int)c;
            break;
        case 5:
            tm.tm_sec = (int)a;
            if (arg_count > 1) millis = (int)b;
            break;
        case 6:
            millis = (int)a;
            break;
        default:
            return NAN;
    }

    tm.tm_isdst = -1;
    time_t t = mktime(&tm);
    if (t == (time_t)-1) {
        d->ms = NAN;
        return NAN;
    }
    d->ms = ((double)t) * 1000.0 + (double)millis;
    return d->ms;
}

double tsc_date_set_legacy_year(tsc_date_t* d, double year) {
    if (!d) return NAN;
    if (isnan(year)) {
        d->ms = NAN;
        return NAN;
    }
    int y = (int)year;
    if (y >= 0 && y <= 99) y += 1900;

    double base_ms = isnan(d->ms) ? 0.0 : d->ms;
    double seconds_double = floor(base_ms / 1000.0);
    time_t seconds = (time_t)seconds_double;
    struct tm tm;
    if (!localtime_r(&seconds, &tm)) {
        d->ms = NAN;
        return NAN;
    }
    double rem = fmod(base_ms, 1000.0);
    if (rem < 0) rem += 1000.0;
    tm.tm_year = y - 1900;
    tm.tm_isdst = -1;
    time_t t = mktime(&tm);
    if (t == (time_t)-1) {
        d->ms = NAN;
        return NAN;
    }
    d->ms = ((double)t) * 1000.0 + floor(rem);
    return d->ms;
}

bool date_parse_fixed_int(const tsc_str_t* text, size_t* pos, size_t digits, int* out) {
    if (!text || !pos || !out || *pos + digits > text->len) return false;
    int value = 0;
    for (size_t i = 0; i < digits; i++) {
        unsigned char ch = (unsigned char)text->data[*pos + i];
        if (!isdigit(ch)) return false;
        value = value * 10 + (int)(ch - '0');
    }
    *pos += digits;
    *out = value;
    return true;
}

bool date_parse_char(const tsc_str_t* text, size_t* pos, char ch) {
    if (!text || !pos || *pos >= text->len || text->data[*pos] != ch) return false;
    *pos += 1;
    return true;
}

double tsc_date_parse(const tsc_str_t* text) {
    if (!text || text->len == 0) return NAN;
    size_t pos = 0;
    int year = 0;
    int month = 0;
    int day = 0;
    int hour = 0;
    int minute = 0;
    int second = 0;
    int ms = 0;
    int offset_minutes = 0;

    if (!date_parse_fixed_int(text, &pos, 4, &year)) return NAN;
    if (!date_parse_char(text, &pos, '-')) return NAN;
    if (!date_parse_fixed_int(text, &pos, 2, &month)) return NAN;
    if (!date_parse_char(text, &pos, '-')) return NAN;
    if (!date_parse_fixed_int(text, &pos, 2, &day)) return NAN;
    if (month < 1 || month > 12 || day < 1 || day > 31) return NAN;

    bool has_time = false;
    if (pos < text->len) {
        char sep = text->data[pos];
        if (sep != 'T' && sep != 't') return NAN;
        pos += 1;
        has_time = true;
        if (!date_parse_fixed_int(text, &pos, 2, &hour)) return NAN;
        if (!date_parse_char(text, &pos, ':')) return NAN;
        if (!date_parse_fixed_int(text, &pos, 2, &minute)) return NAN;
        if (!date_parse_char(text, &pos, ':')) return NAN;
        if (!date_parse_fixed_int(text, &pos, 2, &second)) return NAN;
        if (hour < 0 || hour > 23 || minute < 0 || minute > 59 || second < 0 || second > 59) return NAN;
        if (pos < text->len && text->data[pos] == '.') {
            pos += 1;
            int digits = 0;
            while (pos < text->len && isdigit((unsigned char)text->data[pos])) {
                if (digits < 3) {
                    ms = ms * 10 + (int)(text->data[pos] - '0');
                    digits++;
                }
                pos += 1;
            }
            if (digits == 0) return NAN;
            while (digits < 3) {
                ms *= 10;
                digits++;
            }
        }
        if (pos >= text->len) return NAN;
        if (text->data[pos] == 'Z' || text->data[pos] == 'z') {
            pos += 1;
        } else if (text->data[pos] == '+' || text->data[pos] == '-') {
            int sign = text->data[pos] == '+' ? 1 : -1;
            int tz_hour = 0;
            int tz_minute = 0;
            pos += 1;
            if (!date_parse_fixed_int(text, &pos, 2, &tz_hour)) return NAN;
            if (!date_parse_char(text, &pos, ':')) return NAN;
            if (!date_parse_fixed_int(text, &pos, 2, &tz_minute)) return NAN;
            if (tz_hour > 23 || tz_minute > 59) return NAN;
            offset_minutes = sign * (tz_hour * 60 + tz_minute);
        } else {
            return NAN;
        }
    }
    if (pos != text->len) return NAN;

    struct tm tm;
    memset(&tm, 0, sizeof(tm));
    tm.tm_year = year - 1900;
    tm.tm_mon = month - 1;
    tm.tm_mday = day;
    tm.tm_hour = hour;
    tm.tm_min = minute;
    tm.tm_sec = second;
    time_t t = timegm(&tm);
    struct tm check;
    if (!gmtime_r(&t, &check)) return NAN;
    if (check.tm_year != tm.tm_year || check.tm_mon != tm.tm_mon || check.tm_mday != tm.tm_mday ||
        check.tm_hour != tm.tm_hour || check.tm_min != tm.tm_min || check.tm_sec != tm.tm_sec) {
        return NAN;
    }

    double result = ((double)t) * 1000.0 + (double)ms;
    if (has_time) result -= (double)offset_minutes * 60000.0;
    return result;
}

double tsc_date_utc(double year, double month, double day, double hours, double minutes, double seconds, double ms) {
    if (isnan(year) || isnan(month) || isnan(day) || isnan(hours) || isnan(minutes) || isnan(seconds) || isnan(ms)) {
        return NAN;
    }
    int y = (int)year;
    if (y >= 0 && y <= 99) y += 1900;
    struct tm tm;
    memset(&tm, 0, sizeof(tm));
    tm.tm_year = y - 1900;
    tm.tm_mon = (int)month;
    tm.tm_mday = (int)day;
    tm.tm_hour = (int)hours;
    tm.tm_min = (int)minutes;
    tm.tm_sec = (int)seconds;
    time_t t = timegm(&tm);
    if (t == (time_t)-1) return NAN;
    return ((double)t) * 1000.0 + ms;
}

double tsc_date_local(double year, double month, double day, double hours, double minutes, double seconds, double ms) {
    if (isnan(year) || isnan(month) || isnan(day) || isnan(hours) || isnan(minutes) || isnan(seconds) || isnan(ms)) {
        return NAN;
    }
    int y = (int)year;
    if (y >= 0 && y <= 99) y += 1900;
    struct tm tm;
    memset(&tm, 0, sizeof(tm));
    tm.tm_year = y - 1900;
    tm.tm_mon = (int)month;
    tm.tm_mday = (int)day;
    tm.tm_hour = (int)hours;
    tm.tm_min = (int)minutes;
    tm.tm_sec = (int)seconds;
    tm.tm_isdst = -1;
    time_t t = mktime(&tm);
    if (t == (time_t)-1) return NAN;
    return ((double)t) * 1000.0 + ms;
}

double tsc_date_get_utc_part(const tsc_date_t* d, int part) {
    if (!d || isnan(d->ms)) return NAN;
    double seconds_double = floor(d->ms / 1000.0);
    time_t seconds = (time_t)seconds_double;
    struct tm tm;
    if (!gmtime_r(&seconds, &tm)) return NAN;
    switch (part) {
        case 0: return (double)(tm.tm_year + 1900);
        case 1: return (double)tm.tm_mon;
        case 2: return (double)tm.tm_mday;
        case 3: return (double)tm.tm_wday;
        case 4: return (double)tm.tm_hour;
        case 5: return (double)tm.tm_min;
        case 6: return (double)tm.tm_sec;
        case 7: {
            double rem = fmod(d->ms, 1000.0);
            if (rem < 0) rem += 1000.0;
            return floor(rem);
        }
    }
    return NAN;
}

double date_millis_part(const tsc_date_t* d) {
    double rem = fmod(d->ms, 1000.0);
    if (rem < 0) rem += 1000.0;
    return floor(rem);
}

double tsc_date_get_local_part(const tsc_date_t* d, int part) {
    if (!d || isnan(d->ms)) return NAN;
    double seconds_double = floor(d->ms / 1000.0);
    time_t seconds = (time_t)seconds_double;
    struct tm tm;
    if (!localtime_r(&seconds, &tm)) return NAN;
    switch (part) {
        case 0: return (double)(tm.tm_year + 1900);
        case 1: return (double)tm.tm_mon;
        case 2: return (double)tm.tm_mday;
        case 3: return (double)tm.tm_wday;
        case 4: return (double)tm.tm_hour;
        case 5: return (double)tm.tm_min;
        case 6: return (double)tm.tm_sec;
        case 7: return date_millis_part(d);
    }
    return NAN;
}

double tsc_date_get_timezone_offset(const tsc_date_t* d) {
    if (!d || isnan(d->ms)) return NAN;
    double seconds_double = floor(d->ms / 1000.0);
    time_t seconds = (time_t)seconds_double;
    struct tm local_tm;
    struct tm utc_tm;
    if (!localtime_r(&seconds, &local_tm) || !gmtime_r(&seconds, &utc_tm)) return NAN;
    time_t local_as_utc = timegm(&local_tm);
    time_t utc_as_utc = timegm(&utc_tm);
    return difftime(utc_as_utc, local_as_utc) / 60.0;
}

tsc_str_t* tsc_date_to_iso_string(const tsc_date_t* d) {
    if (!d || isnan(d->ms)) tsc_throw_str(tsc_str_from_lit("RangeError: Invalid time value", 30));
    double seconds_double = floor(d->ms / 1000.0);
    time_t seconds = (time_t)seconds_double;
    struct tm tm;
    if (!gmtime_r(&seconds, &tm)) tsc_throw_str(tsc_str_from_lit("RangeError: Invalid time value", 30));
    double rem = fmod(d->ms, 1000.0);
    if (rem < 0) rem += 1000.0;
    char buf[32];
    snprintf(
        buf,
        sizeof(buf),
        "%04d-%02d-%02dT%02d:%02d:%02d.%03dZ",
        tm.tm_year + 1900,
        tm.tm_mon + 1,
        tm.tm_mday,
        tm.tm_hour,
        tm.tm_min,
        tm.tm_sec,
        (int)floor(rem)
    );
    return tsc_str_from_cstr(buf);
}

tsc_value_t tsc_date_to_json(const tsc_date_t* d) {
    if (!d || isnan(d->ms)) return tsc_value_null();
    return tsc_value_string(tsc_date_to_iso_string(d));
}

tsc_str_t* tsc_date_to_utc_string(const tsc_date_t* d) {
    if (!d || isnan(d->ms)) return tsc_str_from_lit("Invalid Date", 12);
    double seconds_double = floor(d->ms / 1000.0);
    time_t seconds = (time_t)seconds_double;
    struct tm tm;
    if (!gmtime_r(&seconds, &tm)) return tsc_str_from_lit("Invalid Date", 12);
    static const char* weekdays[] = { "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat" };
    static const char* months[] = { "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec" };
    char buf[40];
    snprintf(
        buf,
        sizeof(buf),
        "%s, %02d %s %04d %02d:%02d:%02d GMT",
        weekdays[tm.tm_wday],
        tm.tm_mday,
        months[tm.tm_mon],
        tm.tm_year + 1900,
        tm.tm_hour,
        tm.tm_min,
        tm.tm_sec
    );
    return tsc_str_from_cstr(buf);
}

tsc_str_t* tsc_date_to_date_string(const tsc_date_t* d) {
    if (!d || isnan(d->ms)) return tsc_str_from_lit("Invalid Date", 12);
    double seconds_double = floor(d->ms / 1000.0);
    time_t seconds = (time_t)seconds_double;
    struct tm tm;
    if (!localtime_r(&seconds, &tm)) return tsc_str_from_lit("Invalid Date", 12);
    static const char* weekdays[] = { "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat" };
    static const char* months[] = { "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec" };
    char buf[24];
    snprintf(
        buf,
        sizeof(buf),
        "%s %s %02d %04d",
        weekdays[tm.tm_wday],
        months[tm.tm_mon],
        tm.tm_mday,
        tm.tm_year + 1900
    );
    return tsc_str_from_cstr(buf);
}

tsc_str_t* tsc_date_to_time_string(const tsc_date_t* d) {
    if (!d || isnan(d->ms)) return tsc_str_from_lit("Invalid Date", 12);
    double seconds_double = floor(d->ms / 1000.0);
    time_t seconds = (time_t)seconds_double;
    struct tm tm;
    if (!localtime_r(&seconds, &tm)) return tsc_str_from_lit("Invalid Date", 12);

    int offset_minutes = (int)-tsc_date_get_timezone_offset(d);
    char sign = offset_minutes < 0 ? '-' : '+';
    if (offset_minutes < 0) offset_minutes = -offset_minutes;
    int offset_hours = offset_minutes / 60;
    int offset_remainder = offset_minutes % 60;
    const char* zone_name = offset_minutes == 0 ? "Coordinated Universal Time" : "Local Time";

    char buf[72];
    snprintf(
        buf,
        sizeof(buf),
        "%02d:%02d:%02d GMT%c%02d%02d (%s)",
        tm.tm_hour,
        tm.tm_min,
        tm.tm_sec,
        sign,
        offset_hours,
        offset_remainder,
        zone_name
    );
    return tsc_str_from_cstr(buf);
}

tsc_str_t* tsc_date_to_locale_string(const tsc_date_t* d) {
    if (!d || isnan(d->ms)) return tsc_str_from_lit("Invalid Date", 12);
    double seconds_double = floor(d->ms / 1000.0);
    time_t seconds = (time_t)seconds_double;
    struct tm tm;
    if (!localtime_r(&seconds, &tm)) return tsc_str_from_lit("Invalid Date", 12);

    int hour = tm.tm_hour % 12;
    if (hour == 0) hour = 12;
    const char* ampm = tm.tm_hour < 12 ? "AM" : "PM";
    char buf[32];
    snprintf(
        buf,
        sizeof(buf),
        "%d/%d/%04d, %d:%02d:%02d %s",
        tm.tm_mon + 1,
        tm.tm_mday,
        tm.tm_year + 1900,
        hour,
        tm.tm_min,
        tm.tm_sec,
        ampm
    );
    return tsc_str_from_cstr(buf);
}

tsc_str_t* tsc_date_to_locale_date_string(const tsc_date_t* d) {
    if (!d || isnan(d->ms)) return tsc_str_from_lit("Invalid Date", 12);
    double seconds_double = floor(d->ms / 1000.0);
    time_t seconds = (time_t)seconds_double;
    struct tm tm;
    if (!localtime_r(&seconds, &tm)) return tsc_str_from_lit("Invalid Date", 12);

    char buf[16];
    snprintf(buf, sizeof(buf), "%d/%d/%04d", tm.tm_mon + 1, tm.tm_mday, tm.tm_year + 1900);
    return tsc_str_from_cstr(buf);
}

tsc_str_t* tsc_date_to_locale_time_string(const tsc_date_t* d) {
    if (!d || isnan(d->ms)) return tsc_str_from_lit("Invalid Date", 12);
    double seconds_double = floor(d->ms / 1000.0);
    time_t seconds = (time_t)seconds_double;
    struct tm tm;
    if (!localtime_r(&seconds, &tm)) return tsc_str_from_lit("Invalid Date", 12);

    int hour = tm.tm_hour % 12;
    if (hour == 0) hour = 12;
    const char* ampm = tm.tm_hour < 12 ? "AM" : "PM";
    char buf[16];
    snprintf(buf, sizeof(buf), "%d:%02d:%02d %s", hour, tm.tm_min, tm.tm_sec, ampm);
    return tsc_str_from_cstr(buf);
}

tsc_str_t* tsc_date_to_string(const tsc_date_t* d) {
    if (!d || isnan(d->ms)) return tsc_str_from_lit("Invalid Date", 12);
    double seconds_double = floor(d->ms / 1000.0);
    time_t seconds = (time_t)seconds_double;
    struct tm tm;
    if (!localtime_r(&seconds, &tm)) return tsc_str_from_lit("Invalid Date", 12);

    static const char* weekdays[] = { "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat" };
    static const char* months[] = { "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec" };
    int offset_minutes = (int)-tsc_date_get_timezone_offset(d);
    char sign = offset_minutes < 0 ? '-' : '+';
    if (offset_minutes < 0) offset_minutes = -offset_minutes;
    int offset_hours = offset_minutes / 60;
    int offset_remainder = offset_minutes % 60;
    const char* zone_name = offset_minutes == 0 ? "Coordinated Universal Time" : "Local Time";

    char buf[96];
    snprintf(
        buf,
        sizeof(buf),
        "%s %s %02d %04d %02d:%02d:%02d GMT%c%02d%02d (%s)",
        weekdays[tm.tm_wday],
        months[tm.tm_mon],
        tm.tm_mday,
        tm.tm_year + 1900,
        tm.tm_hour,
        tm.tm_min,
        tm.tm_sec,
        sign,
        offset_hours,
        offset_remainder,
        zone_name
    );
    return tsc_str_from_cstr(buf);
}

tsc_error_t* tsc_error_new(tsc_str_t* message) {
    return tsc_error_new_named(tsc_str_from_lit("Error", 5), message);
}

tsc_error_t* tsc_error_new_named(tsc_str_t* name, tsc_str_t* message) {
    tsc_error_t* e = (tsc_error_t*)TSC_GC_MALLOC(sizeof(tsc_error_t));
    e->name = name ? name : tsc_str_from_lit("Error", 5);
    e->message = message ? message : tsc_str_from_lit("", 0);
    e->cause = tsc_value_undefined();
    e->errors = NULL;
    return e;
}

tsc_error_t* tsc_error_new_named_cause(tsc_str_t* name, tsc_str_t* message, tsc_value_t cause) {
    tsc_error_t* e = tsc_error_new_named(name, message);
    e->cause = cause;
    return e;
}

tsc_error_t* tsc_aggregate_error_new(tsc_array_t* errors, tsc_str_t* message) {
    tsc_error_t* e = tsc_error_new_named(tsc_str_from_lit("AggregateError", 14), message);
    e->errors = errors ? errors : tsc_array_new(sizeof(tsc_value_t), 1);
    return e;
}

tsc_error_t* tsc_aggregate_error_new_cause(tsc_array_t* errors, tsc_str_t* message, tsc_value_t cause) {
    tsc_error_t* e = tsc_aggregate_error_new(errors, message);
    e->cause = cause;
    return e;
}

tsc_str_t* tsc_error_to_string(const tsc_error_t* e) {
    if (!e) return tsc_str_from_lit("Error", 5);
    tsc_str_t* name = e->name ? e->name : tsc_str_from_lit("Error", 5);
    tsc_str_t* message = e->message ? e->message : tsc_str_from_lit("", 0);
    if (name->len == 0) return message;
    if (message->len == 0) return name;
    return tsc_str_concat_n(3, name, tsc_str_from_lit(": ", 2), message);
}

tsc_str_t* tsc_path_extname(const tsc_str_t* p) {
    for (size_t i = p->len; i > 0; i--) {
        char c = p->data[i - 1];
        if (c == '/') break;
        if (c == '.') {
            if (i == 1 || p->data[i - 2] == '/') return tsc_str_from_lit("", 0);
            tsc_str_t* r = str_alloc(p->len - (i - 1));
            memcpy((char*)r->data, p->data + (i - 1), p->len - (i - 1));
            return r;
        }
    }
    return tsc_str_from_lit("", 0);
}

tsc_str_t* path_str_slice(const tsc_str_t* p, size_t start, size_t len) {
    if (!p || start > p->len) return tsc_str_from_lit("", 0);
    if (start + len > p->len) len = p->len - start;
    tsc_str_t* out = str_alloc(len);
    memcpy((char*)out->data, p->data + start, len);
    return out;
}

tsc_value_t tsc_path_parse(const tsc_str_t* p) {
    tsc_object_t* out = tsc_object_new();
    if (!p) p = tsc_str_from_lit("", 0);
    tsc_str_t* root = tsc_path_is_absolute(p) ? tsc_str_from_lit("/", 1) : tsc_str_from_lit("", 0);
    tsc_str_t* dir = tsc_path_dirname(p);
    if (str_lit_eq(dir, ".") && !tsc_path_is_absolute(p)) dir = tsc_str_from_lit("", 0);
    tsc_str_t* base = tsc_path_basename(p);
    tsc_str_t* ext = tsc_path_extname(base);
    size_t name_len = base->len >= ext->len ? base->len - ext->len : base->len;
    tsc_str_t* name = path_str_slice(base, 0, name_len);
    tsc_object_set(out, tsc_str_from_lit("root", 4), tsc_value_string(root));
    tsc_object_set(out, tsc_str_from_lit("dir", 3), tsc_value_string(dir));
    tsc_object_set(out, tsc_str_from_lit("base", 4), tsc_value_string(base));
    tsc_object_set(out, tsc_str_from_lit("ext", 3), tsc_value_string(ext));
    tsc_object_set(out, tsc_str_from_lit("name", 4), tsc_value_string(name));
    return tsc_value_object(out);
}

tsc_str_t* path_get_string_prop(tsc_value_t object, const char* key, size_t key_len) {
    if (!value_is_box(object) || value_tag(object) != TSC_VALUE_TAG_OBJECT) return NULL;
    tsc_value_t value = tsc_object_get((tsc_object_t*)value_ptr(object), tsc_str_from_lit(key, key_len));
    if (tsc_value_is_nullish(value)) return NULL;
    return tsc_value_to_string(value);
}

tsc_str_t* tsc_path_format(tsc_value_t path_object) {
    tsc_str_t* root = path_get_string_prop(path_object, "root", 4);
    tsc_str_t* dir = path_get_string_prop(path_object, "dir", 3);
    tsc_str_t* base = path_get_string_prop(path_object, "base", 4);
    if (!base) {
        tsc_str_t* name = path_get_string_prop(path_object, "name", 4);
        tsc_str_t* ext = path_get_string_prop(path_object, "ext", 3);
        if (!name) name = tsc_str_from_lit("", 0);
        if (!ext) ext = tsc_str_from_lit("", 0);
        base = tsc_str_concat(name, ext);
    }
    if (!root) root = tsc_str_from_lit("", 0);
    if (!dir) dir = tsc_str_from_lit("", 0);
    if (dir->len > 0) {
        if (base->len == 0) return dir;
        if (dir->data[dir->len - 1] == '/') return tsc_str_concat(dir, base);
        return tsc_str_concat_n(3, dir, tsc_str_from_lit("/", 1), base);
    }
    if (root->len > 0) {
        if (base->len == 0) return root;
        if (root->data[root->len - 1] == '/') return tsc_str_concat(root, base);
        return tsc_str_concat_n(3, root, tsc_str_from_lit("/", 1), base);
    }
    return base;
}

double tsc_fs_open_sync(const tsc_str_t* path, const tsc_str_t* flags_str, double flags_num, bool flags_is_num, double mode) {
    char* path_c = cstr_dup(path);
    int open_flags = 0;
    char* flags_c = NULL;
    if (flags_is_num) {
        open_flags = (int)flags_num;
    } else {
        const char* f = "r";
        if (flags_str && flags_str->data) {
            flags_c = cstr_dup(flags_str);
            f = flags_c;
        }
        if (strcmp(f, "r") == 0) {
            open_flags = O_RDONLY;
        } else if (strcmp(f, "r+") == 0) {
            open_flags = O_RDWR;
        } else if (strcmp(f, "rs") == 0) {
            open_flags = O_RDONLY | O_SYNC;
        } else if (strcmp(f, "rs+") == 0) {
            open_flags = O_RDWR | O_SYNC;
        } else if (strcmp(f, "w") == 0) {
            open_flags = O_WRONLY | O_CREAT | O_TRUNC;
        } else if (strcmp(f, "wx") == 0 || strcmp(f, "xw") == 0) {
            open_flags = O_WRONLY | O_CREAT | O_TRUNC | O_EXCL;
        } else if (strcmp(f, "w+") == 0) {
            open_flags = O_RDWR | O_CREAT | O_TRUNC;
        } else if (strcmp(f, "wx+") == 0 || strcmp(f, "xw+") == 0) {
            open_flags = O_RDWR | O_CREAT | O_TRUNC | O_EXCL;
        } else if (strcmp(f, "a") == 0) {
            open_flags = O_WRONLY | O_CREAT | O_APPEND;
        } else if (strcmp(f, "ax") == 0 || strcmp(f, "xa") == 0) {
            open_flags = O_WRONLY | O_CREAT | O_APPEND | O_EXCL;
        } else if (strcmp(f, "a+") == 0) {
            open_flags = O_RDWR | O_CREAT | O_APPEND;
        } else if (strcmp(f, "ax+") == 0 || strcmp(f, "xa+") == 0) {
            open_flags = O_RDWR | O_CREAT | O_APPEND | O_EXCL;
        } else if (strcmp(f, "as") == 0) {
            open_flags = O_WRONLY | O_CREAT | O_APPEND | O_SYNC;
        } else if (strcmp(f, "as+") == 0) {
            open_flags = O_RDWR | O_CREAT | O_APPEND | O_SYNC;
        } else {
            char err_msg[256];
            snprintf(err_msg, sizeof(err_msg), "fs.openSync: unsupported flags '%s'", f);
            free(flags_c);
            free(path_c);
            tsc_throw_str(tsc_str_from_cstr(err_msg));
            return -1.0;
        }
    }
    mode_t open_mode = 0666;
    if (mode >= 0) {
        open_mode = (mode_t)mode;
    }
    free(flags_c);
    int fd = open(path_c, open_flags, open_mode);
    free(path_c);
    if (fd < 0) {
        char err_msg[256];
        snprintf(err_msg, sizeof(err_msg), "fs.openSync: could not open file, %s", strerror(errno));
        tsc_throw_str(tsc_str_from_cstr(err_msg));
        return -1.0;
    }
    return (double)fd;
}

void tsc_fs_close_sync(double fd) {
    int fd_int = (int)fd;
    int r = close(fd_int);
    if (r != 0) {
        char err_msg[256];
        snprintf(err_msg, sizeof(err_msg), "fs.closeSync: could not close file descriptor %d, %s", fd_int, strerror(errno));
        tsc_throw_str(tsc_str_from_cstr(err_msg));
    }
}

double tsc_fs_read_sync(double fd, tsc_buffer_t* buffer, double offset, double length, double position, bool position_is_null) {
    int fd_int = (int)fd;
    if (!buffer) {
        tsc_throw_str(tsc_str_from_cstr("fs.readSync: buffer is null"));
        return 0.0;
    }
    double off_d = offset < 0 ? 0.0 : offset;
    size_t off = (size_t)off_d;
    if (off > buffer->len) {
        tsc_throw_str(tsc_str_from_cstr("fs.readSync: offset out of bounds"));
        return 0.0;
    }
    double len_d = length < 0 ? (double)(buffer->len - off) : length;
    size_t len = (size_t)len_d;
    if (off + len > buffer->len) {
        tsc_throw_str(tsc_str_from_cstr("fs.readSync: offset + length out of bounds"));
        return 0.0;
    }
    uint8_t* ptr = buffer->data + off;
    ssize_t bytes_read = 0;
    if (position_is_null) {
        bytes_read = read(fd_int, ptr, len);
    } else {
        bytes_read = pread(fd_int, ptr, len, (off_t)position);
    }
    if (bytes_read < 0) {
        char err_msg[256];
        snprintf(err_msg, sizeof(err_msg), "fs.readSync: read failed, %s", strerror(errno));
        tsc_throw_str(tsc_str_from_cstr(err_msg));
        return 0.0;
    }
    return (double)bytes_read;
}

double tsc_fs_write_buffer_sync(double fd, const tsc_buffer_t* buffer, double offset, double length, double position, bool position_is_null) {
    int fd_int = (int)fd;
    if (!buffer) {
        tsc_throw_str(tsc_str_from_cstr("fs.writeSync: buffer is null"));
        return 0.0;
    }
    double off_d = offset < 0 ? 0.0 : offset;
    size_t off = (size_t)off_d;
    if (off > buffer->len) {
        tsc_throw_str(tsc_str_from_cstr("fs.writeSync: offset out of bounds"));
        return 0.0;
    }
    double len_d = length < 0 ? (double)(buffer->len - off) : length;
    size_t len = (size_t)len_d;
    if (off + len > buffer->len) {
        tsc_throw_str(tsc_str_from_cstr("fs.writeSync: offset + length out of bounds"));
        return 0.0;
    }
    const uint8_t* ptr = buffer->data + off;
    ssize_t bytes_written = 0;
    if (position_is_null) {
        bytes_written = write(fd_int, ptr, len);
    } else {
        bytes_written = pwrite(fd_int, ptr, len, (off_t)position);
    }
    if (bytes_written < 0) {
        char err_msg[256];
        snprintf(err_msg, sizeof(err_msg), "fs.writeSync: write failed, %s", strerror(errno));
        tsc_throw_str(tsc_str_from_cstr(err_msg));
        return 0.0;
    }
    return (double)bytes_written;
}

double tsc_fs_write_string_sync(double fd, const tsc_str_t* str, double position, bool position_is_null) {
    int fd_int = (int)fd;
    if (!str) {
        tsc_throw_str(tsc_str_from_cstr("fs.writeSync: string is null"));
        return 0.0;
    }
    const char* ptr = str->data;
    size_t len = str->len;
    ssize_t bytes_written = 0;
    if (position_is_null) {
        bytes_written = write(fd_int, ptr, len);
    } else {
        bytes_written = pwrite(fd_int, ptr, len, (off_t)position);
    }
    if (bytes_written < 0) {
        char err_msg[256];
        snprintf(err_msg, sizeof(err_msg), "fs.writeSync: write failed, %s", strerror(errno));
        tsc_throw_str(tsc_str_from_cstr(err_msg));
        return 0.0;
    }
    return (double)bytes_written;
}

double tsc_fs_readv_sync(double fd, const tsc_array_t* buffers, double position, bool position_is_null) {
    int fd_int = (int)fd;
    if (!buffers) {
        tsc_throw_str(tsc_str_from_cstr("fs.readvSync: buffers array is null"));
        return 0.0;
    }
    size_t iovcnt = buffers->len;
    if (iovcnt == 0) {
        return 0.0;
    }
    struct iovec* iov = NULL;
    struct iovec iov_stack[32];
    if (iovcnt > 32) {
        iov = (struct iovec*)malloc(iovcnt * sizeof(struct iovec));
        if (!iov) {
            tsc_throw_str(tsc_str_from_cstr("fs.readvSync: out of memory"));
            return 0.0;
        }
    } else {
        iov = iov_stack;
    }

    for (size_t i = 0; i < iovcnt; i++) {
        tsc_buffer_t* part = TSC_ARR(tsc_buffer_t*, buffers, i);
        if (!part) {
            if (iovcnt > 32) free(iov);
            tsc_throw_str(tsc_str_from_cstr("fs.readvSync: buffer in array is null"));
            return 0.0;
        }
        iov[i].iov_base = part->data;
        iov[i].iov_len = part->len;
    }

    ssize_t bytes_read = 0;
    if (position_is_null) {
        bytes_read = readv(fd_int, iov, iovcnt);
    } else {
        bytes_read = preadv(fd_int, iov, iovcnt, (off_t)position);
    }
    if (iovcnt > 32) {
        free(iov);
    }
    if (bytes_read < 0) {
        char err_msg[256];
        snprintf(err_msg, sizeof(err_msg), "fs.readvSync: read failed, %s", strerror(errno));
        tsc_throw_str(tsc_str_from_cstr(err_msg));
        return 0.0;
    }
    return (double)bytes_read;
}

double tsc_fs_writev_sync(double fd, const tsc_array_t* buffers, double position, bool position_is_null) {
    int fd_int = (int)fd;
    if (!buffers) {
        tsc_throw_str(tsc_str_from_cstr("fs.writevSync: buffers array is null"));
        return 0.0;
    }
    size_t iovcnt = buffers->len;
    if (iovcnt == 0) {
        return 0.0;
    }
    struct iovec* iov = NULL;
    struct iovec iov_stack[32];
    if (iovcnt > 32) {
        iov = (struct iovec*)malloc(iovcnt * sizeof(struct iovec));
        if (!iov) {
            tsc_throw_str(tsc_str_from_cstr("fs.writevSync: out of memory"));
            return 0.0;
        }
    } else {
        iov = iov_stack;
    }

    for (size_t i = 0; i < iovcnt; i++) {
        const tsc_buffer_t* part = TSC_ARR(tsc_buffer_t*, buffers, i);
        if (!part) {
            if (iovcnt > 32) free(iov);
            tsc_throw_str(tsc_str_from_cstr("fs.writevSync: buffer in array is null"));
            return 0.0;
        }
        iov[i].iov_base = part->data;
        iov[i].iov_len = part->len;
    }

    ssize_t bytes_written = 0;
    if (position_is_null) {
        bytes_written = writev(fd_int, iov, iovcnt);
    } else {
        bytes_written = pwritev(fd_int, iov, iovcnt, (off_t)position);
    }
    if (iovcnt > 32) {
        free(iov);
    }
    if (bytes_written < 0) {
        char err_msg[256];
        snprintf(err_msg, sizeof(err_msg), "fs.writevSync: write failed, %s", strerror(errno));
        tsc_throw_str(tsc_str_from_cstr(err_msg));
        return 0.0;
    }
    return (double)bytes_written;
}

static size_t find_substring(const char* data, size_t len, size_t start, const char* sub, size_t sub_len) {
    if (sub_len == 0) return start;
    if (start + sub_len > len) return (size_t)-1;
    for (size_t i = start; i <= len - sub_len; i++) {
        if (memcmp(data + i, sub, sub_len) == 0) {
            return i;
        }
    }
    return (size_t)-1;
}

static bool querystring_encode_byte(unsigned char ch) {
    if ((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || (ch >= '0' && ch <= '9')) return false;
    return !(ch == '-' || ch == '.' || ch == '_' || ch == '~' || ch == '!' || ch == '*' || ch == '\'' || ch == '(' || ch == ')');
}

static tsc_str_t* querystring_escape(const tsc_str_t* input) {
    if (!input) return tsc_str_from_lit("", 0);
    size_t out_len = 0;
    for (size_t i = 0; i < input->len; i++) {
        unsigned char ch = (unsigned char)input->data[i];
        out_len += querystring_encode_byte(ch) ? 3 : 1;
    }
    tsc_str_t* out = str_alloc(out_len);
    char* w = (char*)out->data;
    size_t j = 0;
    static const char hex[] = "0123456789ABCDEF";
    for (size_t i = 0; i < input->len; i++) {
        unsigned char ch = (unsigned char)input->data[i];
        if (querystring_encode_byte(ch)) {
            w[j++] = '%';
            w[j++] = hex[ch >> 4];
            w[j++] = hex[ch & 15];
        } else {
            w[j++] = (char)ch;
        }
    }
    out->len = j;
    w[j] = '\0';
    return out;
}

tsc_str_t* tsc_querystring_escape(const tsc_str_t* str) {
    return querystring_escape(str);
}

static tsc_str_t* querystring_unescape(const tsc_str_t* input) {
    if (!input) return tsc_str_from_lit("", 0);
    tsc_str_t* out = str_alloc(input->len);
    char* w = (char*)out->data;
    size_t j = 0;
    for (size_t i = 0; i < input->len; i++) {
        if (input->data[i] == '%' && i + 2 < input->len && url_hex_value(input->data[i + 1]) >= 0 && url_hex_value(input->data[i + 2]) >= 0) {
            int hi = url_hex_value(input->data[i + 1]);
            int lo = url_hex_value(input->data[i + 2]);
            w[j++] = (char)((hi << 4) | lo);
            i += 2;
        } else {
            w[j++] = input->data[i];
        }
    }
    out->len = j;
    w[j] = '\0';
    return out;
}

tsc_str_t* tsc_querystring_unescape(const tsc_str_t* str) {
    return querystring_unescape(str);
}

tsc_value_t tsc_querystring_parse(const tsc_str_t* str, tsc_value_t sep_val, tsc_value_t eq_val, tsc_value_t options_val) {
    (void)options_val;
    tsc_str_t* sep = tsc_value_is_nullish(sep_val) ? tsc_str_from_lit("&", 1) : tsc_value_to_string(sep_val);
    tsc_str_t* eq = tsc_value_is_nullish(eq_val) ? tsc_str_from_lit("=", 1) : tsc_value_to_string(eq_val);

    tsc_value_t obj_val = tsc_value_object_create(tsc_value_null());
    tsc_object_t* obj = (tsc_object_t*)value_ptr(obj_val);

    if (!str || str->len == 0) {
        return obj_val;
    }

    if (sep->len == 0) {
        return obj_val;
    }

    size_t start = 0;
    while (start < str->len) {
        size_t next_sep = find_substring(str->data, str->len, start, sep->data, sep->len);
        size_t segment_end = (next_sep == (size_t)-1) ? str->len : next_sep;

        if (segment_end > start) {
            size_t eq_idx = find_substring(str->data, segment_end, start, eq->data, eq->len);
            tsc_str_t* key = NULL;
            tsc_str_t* val = NULL;
            if (eq_idx == (size_t)-1) {
                key = url_query_decode_range(str->data, start, segment_end);
                val = tsc_str_from_lit("", 0);
            } else {
                key = url_query_decode_range(str->data, start, eq_idx);
                val = url_query_decode_range(str->data, eq_idx + eq->len, segment_end);
            }

            if (tsc_object_has_own(obj, key)) {
                tsc_value_t existing = tsc_object_get(obj, key);
                if (tsc_value_is_array(existing)) {
                    tsc_array_t* arr = tsc_value_as_array(existing);
                    tsc_array_push_value(arr, tsc_value_string(val));
                } else {
                    tsc_array_t* arr = tsc_array_new(sizeof(tsc_value_t), 2);
                    tsc_array_push_value(arr, existing);
                    tsc_array_push_value(arr, tsc_value_string(val));
                    tsc_object_set(obj, key, tsc_value_array(arr));
                }
            } else {
                tsc_object_set(obj, key, tsc_value_string(val));
            }
        }

        if (next_sep == (size_t)-1) break;
        start = next_sep + sep->len;
    }

    return obj_val;
}

tsc_str_t* tsc_querystring_stringify(tsc_value_t obj_val, tsc_value_t sep_val, tsc_value_t eq_val, tsc_value_t options_val) {
    (void)options_val;
    tsc_str_t* sep = tsc_value_is_nullish(sep_val) ? tsc_str_from_lit("&", 1) : tsc_value_to_string(sep_val);
    tsc_str_t* eq = tsc_value_is_nullish(eq_val) ? tsc_str_from_lit("=", 1) : tsc_value_to_string(eq_val);

    if (tsc_value_is_nullish(obj_val) || !value_is_box(obj_val) || value_tag(obj_val) != TSC_VALUE_TAG_OBJECT) {
        return tsc_str_from_lit("", 0);
    }

    tsc_array_t* keys = tsc_value_object_keys(obj_val);
    if (!keys || keys->len == 0) {
        return tsc_str_from_lit("", 0);
    }

    tsc_array_t* pieces = tsc_array_new(sizeof(tsc_str_t*), 4);
    for (size_t i = 0; i < keys->len; i++) {
        tsc_str_t* key = ((tsc_str_t**)keys->data)[i];
        tsc_value_t val = tsc_value_get_prop(obj_val, key);

        if (tsc_value_is_array(val)) {
            tsc_array_t* arr = tsc_value_as_array(val);
            for (size_t j = 0; j < arr->len; j++) {
                tsc_value_t elem = TSC_ARR(tsc_value_t, arr, j);
                tsc_str_t* elem_str = tsc_value_to_string(elem);

                tsc_str_t* encoded_key = querystring_escape(key);
                tsc_str_t* encoded_val = querystring_escape(elem_str);

                tsc_str_t* piece = tsc_str_concat(encoded_key, tsc_str_concat(eq, encoded_val));
                tsc_array_push_raw(pieces, &piece);
            }
        } else {
            tsc_str_t* val_str = tsc_value_to_string(val);

            tsc_str_t* encoded_key = querystring_escape(key);
            tsc_str_t* encoded_val = querystring_escape(val_str);

            tsc_str_t* piece = tsc_str_concat(encoded_key, tsc_str_concat(eq, encoded_val));
            tsc_array_push_raw(pieces, &piece);
        }
    }

    if (pieces->len == 0) {
        return tsc_str_from_lit("", 0);
    }

    size_t total_len = (pieces->len - 1) * sep->len;
    for (size_t i = 0; i < pieces->len; i++) {
        tsc_str_t* p = ((tsc_str_t**)pieces->data)[i];
        total_len += p->len;
    }

    tsc_str_t* out = str_alloc(total_len);
    char* w = (char*)out->data;
    size_t offset = 0;
    for (size_t i = 0; i < pieces->len; i++) {
        if (i > 0) {
            memcpy(w + offset, sep->data, sep->len);
            offset += sep->len;
        }
        tsc_str_t* p = ((tsc_str_t**)pieces->data)[i];
        memcpy(w + offset, p->data, p->len);
        offset += p->len;
    }
    out->len = offset;
    w[offset] = '\0';
    return out;
}

void tsc_fs_fsync_sync(double fd) {
    int fd_int = (int)fd;
    int r = fsync(fd_int);
    if (r != 0) {
        char err_msg[256];
        snprintf(err_msg, sizeof(err_msg), "fs.fsyncSync: fsync failed, %s", strerror(errno));
        tsc_throw_str(tsc_str_from_cstr(err_msg));
    }
}

void tsc_fs_fdatasync_sync(double fd) {
    int fd_int = (int)fd;
    int r = fdatasync(fd_int);
    if (r != 0) {
        char err_msg[256];
        snprintf(err_msg, sizeof(err_msg), "fs.fdatasyncSync: fdatasync failed, %s", strerror(errno));
        tsc_throw_str(tsc_str_from_cstr(err_msg));
    }
}

void tsc_fs_ftruncate_sync(double fd, double len) {
    int fd_int = (int)fd;
    off_t length = (off_t)len;
    int r = ftruncate(fd_int, length);
    if (r != 0) {
        char err_msg[256];
        snprintf(err_msg, sizeof(err_msg), "fs.ftruncateSync: ftruncate failed, %s", strerror(errno));
        tsc_throw_str(tsc_str_from_cstr(err_msg));
    }
}
