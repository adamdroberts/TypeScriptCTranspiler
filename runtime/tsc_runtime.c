#define _POSIX_C_SOURCE 200809L
#define _DEFAULT_SOURCE
#include "tsc_runtime.h"
#include <ctype.h>
#include <dirent.h>
#include <errno.h>
#include <libgen.h>
#include <limits.h>
#include <openssl/sha.h>
#include <gmp.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <time.h>
#include <unicode/unorm2.h>
#include <unicode/ustring.h>
#include <unistd.h>

#ifndef PATH_MAX
#  define PATH_MAX 4096
#endif

int tsc_argc;
char** tsc_argv;

static tsc_try_frame_t* g_try_top = NULL;
static tsc_str_t* g_current_error = NULL;

/* Forward decls for helpers used across sections. */
static tsc_str_t* str_alloc(size_t len);
static char* cstr_dup(const tsc_str_t* s);

static bool str_lit_eq(const tsc_str_t* s, const char* lit) {
    size_t n = strlen(lit);
    return s && s->len == n && memcmp(s->data, lit, n) == 0;
}

void tsc_bootstrap(int argc, char** argv) {
    TSC_GC_INIT();
    tsc_argc = argc;
    tsc_argv = argv;
    srand((unsigned)time(NULL));
}

void tsc_panic(const char* msg) {
    fputs("tsc: panic: ", stderr);
    fputs(msg, stderr);
    fputc('\n', stderr);
    abort();
}

void tsc_process_exit(double code) {
    int c = 0;
    if (!isnan(code) && !isinf(code)) c = (int)code;
    exit(c);
}

tsc_array_t* tsc_process_argv(void) {
    tsc_array_t* a = tsc_array_new(sizeof(tsc_str_t*), (size_t)tsc_argc);
    for (int i = 0; i < tsc_argc; i++) {
        tsc_str_t* s = tsc_str_from_cstr(tsc_argv[i]);
        tsc_array_push_raw(a, &s);
    }
    return a;
}

tsc_str_t* tsc_process_env_get(const tsc_str_t* name) {
    char key[512];
    size_t n = name->len < 511 ? name->len : 511;
    memcpy(key, name->data, n);
    key[n] = '\0';
    const char* v = getenv(key);
    return v ? tsc_str_from_cstr(v) : NULL;
}

tsc_str_t* tsc_process_cwd(void) {
    char buf[4096];
    if (getcwd(buf, sizeof buf)) {
        return tsc_str_from_cstr(buf);
    }
    return tsc_str_from_lit("/", 1);
}

/* ---------------- strings ---------------- */

static tsc_str_t* str_alloc(size_t len) {
    tsc_str_t* s = (tsc_str_t*)TSC_GC_MALLOC(sizeof(tsc_str_t));
    char* buf = (char*)TSC_GC_MALLOC_ATOMIC(len + 1);
    buf[len] = '\0';
    s->len = len;
    s->data = buf;
    return s;
}

tsc_str_t* tsc_str_from_lit(const char* data, size_t len) {
    tsc_str_t* s = (tsc_str_t*)TSC_GC_MALLOC(sizeof(tsc_str_t));
    s->len = len;
    s->data = data;
    return s;
}

tsc_str_t* tsc_str_from_cstr(const char* src) {
    size_t n = strlen(src);
    tsc_str_t* s = str_alloc(n);
    memcpy((char*)s->data, src, n);
    return s;
}

tsc_str_t* tsc_str_concat(const tsc_str_t* a, const tsc_str_t* b) {
    tsc_str_t* s = str_alloc(a->len + b->len);
    memcpy((char*)s->data, a->data, a->len);
    memcpy((char*)s->data + a->len, b->data, b->len);
    return s;
}

tsc_str_t* tsc_str_from_num(double n) {
    char buf[64];
    int len;
    if (isnan(n)) {
        return tsc_str_from_lit("NaN", 3);
    }
    if (isinf(n)) {
        return n < 0 ? tsc_str_from_lit("-Infinity", 9) : tsc_str_from_lit("Infinity", 8);
    }
    if (n == 0.0) {
        return tsc_str_from_lit("0", 1);
    }
    if (n == (double)(int64_t)n && n > -1e16 && n < 1e16) {
        len = (int)snprintf(buf, sizeof buf, "%lld", (long long)n);
        tsc_str_t* s = str_alloc((size_t)len);
        memcpy((char*)s->data, buf, (size_t)len);
        return s;
    }
    /* Shortest round-trip: try 1..17 significant digits. */
    for (int prec = 1; prec <= 17; prec++) {
        snprintf(buf, sizeof buf, "%.*g", prec, n);
        double rt = strtod(buf, NULL);
        if (rt == n) break;
    }
    len = (int)strlen(buf);
    tsc_str_t* s = str_alloc((size_t)len);
    memcpy((char*)s->data, buf, (size_t)len);
    return s;
}

tsc_str_t* tsc_str_from_bool(bool b) {
    static const char T[] = "true";
    static const char F[] = "false";
    return b ? tsc_str_from_lit(T, 4) : tsc_str_from_lit(F, 5);
}

static uint16_t to_uint16_code_unit(double n) {
    if (isnan(n) || isinf(n)) return 0;
    int64_t i = (int64_t)n;
    return (uint16_t)(i & 0xffff);
}

static size_t utf8_len_for_code_point(uint32_t cp) {
    if (cp <= 0x7f) return 1;
    if (cp <= 0x7ff) return 2;
    if (cp <= 0xffff) return 3;
    return 4;
}

static size_t write_utf8_code_point(char* out, uint32_t cp) {
    if (cp <= 0x7f) {
        out[0] = (char)cp;
        return 1;
    }
    if (cp <= 0x7ff) {
        out[0] = (char)(0xc0 | (cp >> 6));
        out[1] = (char)(0x80 | (cp & 0x3f));
        return 2;
    }
    if (cp <= 0xffff) {
        out[0] = (char)(0xe0 | (cp >> 12));
        out[1] = (char)(0x80 | ((cp >> 6) & 0x3f));
        out[2] = (char)(0x80 | (cp & 0x3f));
        return 3;
    }
    out[0] = (char)(0xf0 | (cp >> 18));
    out[1] = (char)(0x80 | ((cp >> 12) & 0x3f));
    out[2] = (char)(0x80 | ((cp >> 6) & 0x3f));
    out[3] = (char)(0x80 | (cp & 0x3f));
    return 4;
}

static bool decode_utf8_at(const tsc_str_t* s, size_t pos, uint32_t* cp, size_t* adv) {
    if (pos >= s->len) return false;
    const unsigned char* p = (const unsigned char*)s->data + pos;
    unsigned char b0 = p[0];
    if (b0 < 0x80) {
        *cp = b0;
        *adv = 1;
        return true;
    }
    if ((b0 & 0xe0) == 0xc0 && pos + 1 < s->len) {
        *cp = ((uint32_t)(b0 & 0x1f) << 6) | (uint32_t)(p[1] & 0x3f);
        *adv = 2;
        return true;
    }
    if ((b0 & 0xf0) == 0xe0 && pos + 2 < s->len) {
        *cp =
            ((uint32_t)(b0 & 0x0f) << 12) |
            ((uint32_t)(p[1] & 0x3f) << 6) |
            (uint32_t)(p[2] & 0x3f);
        *adv = 3;
        return true;
    }
    if ((b0 & 0xf8) == 0xf0 && pos + 3 < s->len) {
        *cp =
            ((uint32_t)(b0 & 0x07) << 18) |
            ((uint32_t)(p[1] & 0x3f) << 12) |
            ((uint32_t)(p[2] & 0x3f) << 6) |
            (uint32_t)(p[3] & 0x3f);
        *adv = 4;
        return true;
    }
    *cp = 0xfffd;
    *adv = 1;
    return true;
}

static bool is_high_surrogate(uint16_t u) { return u >= 0xd800 && u <= 0xdbff; }
static bool is_low_surrogate(uint16_t u) { return u >= 0xdc00 && u <= 0xdfff; }

static uint32_t surrogate_pair_to_code_point(uint16_t hi, uint16_t lo) {
    return 0x10000u + ((((uint32_t)hi - 0xd800u) << 10) | ((uint32_t)lo - 0xdc00u));
}

tsc_str_t* tsc_str_from_char_code_n(size_t n, ...) {
    uint16_t* units = (uint16_t*)TSC_GC_MALLOC_ATOMIC(sizeof(uint16_t) * (n ? n : 1));
    va_list ap;
    va_start(ap, n);
    for (size_t i = 0; i < n; i++) {
        units[i] = to_uint16_code_unit(va_arg(ap, double));
    }
    va_end(ap);

    size_t len = 0;
    for (size_t i = 0; i < n; i++) {
        uint32_t cp = units[i];
        if (is_high_surrogate(units[i]) && i + 1 < n && is_low_surrogate(units[i + 1])) {
            cp = surrogate_pair_to_code_point(units[i], units[i + 1]);
            i++;
        } else if (is_high_surrogate(units[i]) || is_low_surrogate(units[i])) {
            cp = 0xfffd;
        }
        len += utf8_len_for_code_point(cp);
    }

    tsc_str_t* s = str_alloc(len);
    char* out = (char*)s->data;
    size_t pos = 0;
    for (size_t i = 0; i < n; i++) {
        uint32_t cp = units[i];
        if (is_high_surrogate(units[i]) && i + 1 < n && is_low_surrogate(units[i + 1])) {
            cp = surrogate_pair_to_code_point(units[i], units[i + 1]);
            i++;
        } else if (is_high_surrogate(units[i]) || is_low_surrogate(units[i])) {
            cp = 0xfffd;
        }
        pos += write_utf8_code_point(out + pos, cp);
    }
    return s;
}

bool tsc_str_eq(const tsc_str_t* a, const tsc_str_t* b) {
    if (a == b) return true;
    if (a->len != b->len) return false;
    return memcmp(a->data, b->data, a->len) == 0;
}

int tsc_str_cmp(const tsc_str_t* a, const tsc_str_t* b) {
    size_t m = a->len < b->len ? a->len : b->len;
    int r = memcmp(a->data, b->data, m);
    if (r != 0) return r;
    if (a->len < b->len) return -1;
    if (a->len > b->len) return 1;
    return 0;
}

double tsc_str_locale_compare(const tsc_str_t* a, const tsc_str_t* b) {
    int c = tsc_str_cmp(a, b);
    return c < 0 ? -1.0 : c > 0 ? 1.0 : 0.0;
}

double tsc_str_length(const tsc_str_t* s) { return (double)s->len; }

tsc_str_t* tsc_str_char_at(const tsc_str_t* s, double idx) {
    size_t i = (size_t)idx;
    if (idx < 0 || i >= s->len) return tsc_str_from_lit("", 0);
    tsc_str_t* out = str_alloc(1);
    ((char*)out->data)[0] = s->data[i];
    return out;
}

tsc_str_t* tsc_str_at(const tsc_str_t* s, double idx) {
    if (isnan(idx)) idx = 0.0;
    if (idx < 0) idx = (double)s->len + idx;
    if (isinf(idx) || idx < 0 || idx >= (double)s->len) return tsc_str_from_lit("", 0);
    return tsc_str_char_at(s, idx);
}

double tsc_str_code_point_at(const tsc_str_t* s, double idx) {
    if (idx < 0 || isnan(idx) || isinf(idx)) return NAN;
    size_t target = (size_t)idx;
    size_t code_unit_index = 0;
    size_t pos = 0;
    while (pos < s->len) {
        uint32_t cp = 0xfffd;
        size_t adv = 1;
        decode_utf8_at(s, pos, &cp, &adv);
        if (cp > 0xffff) {
            uint32_t shifted = cp - 0x10000u;
            uint16_t lo = (uint16_t)(0xdc00u + (shifted & 0x3ffu));
            if (code_unit_index == target) return (double)cp;
            if (code_unit_index + 1 == target) return (double)lo;
            code_unit_index += 2;
        } else {
            if (code_unit_index == target) return (double)cp;
            code_unit_index++;
        }
        pos += adv;
    }
    return NAN;
}

double tsc_str_index_of(const tsc_str_t* h, const tsc_str_t* n) {
    if (n->len == 0) return 0.0;
    if (n->len > h->len) return -1.0;
    for (size_t i = 0; i + n->len <= h->len; i++) {
        if (memcmp(h->data + i, n->data, n->len) == 0) return (double)i;
    }
    return -1.0;
}

double tsc_str_last_index_of(const tsc_str_t* h, const tsc_str_t* n) {
    if (n->len == 0) return (double)h->len;
    if (n->len > h->len) return -1.0;
    size_t i = h->len - n->len + 1;
    while (i > 0) {
        i--;
        if (memcmp(h->data + i, n->data, n->len) == 0) return (double)i;
    }
    return -1.0;
}

bool tsc_str_includes(const tsc_str_t* h, const tsc_str_t* n) {
    return tsc_str_index_of(h, n) >= 0;
}

bool tsc_str_starts_with(const tsc_str_t* s, const tsc_str_t* p) {
    if (p->len > s->len) return false;
    return memcmp(s->data, p->data, p->len) == 0;
}

bool tsc_str_ends_with(const tsc_str_t* s, const tsc_str_t* p) {
    if (p->len > s->len) return false;
    return memcmp(s->data + (s->len - p->len), p->data, p->len) == 0;
}

tsc_str_t* tsc_str_slice(const tsc_str_t* s, double start, double end) {
    int64_t slen = (int64_t)s->len;
    int64_t i0 = (int64_t)start;
    int64_t i1 = (int64_t)end;
    if (i0 < 0) i0 = slen + i0;
    if (i1 < 0) i1 = slen + i1;
    if (i0 < 0) i0 = 0;
    if (i1 > slen) i1 = slen;
    if (i0 > i1) i0 = i1;
    size_t n = (size_t)(i1 - i0);
    tsc_str_t* r = str_alloc(n);
    memcpy((char*)r->data, s->data + i0, n);
    return r;
}

static int64_t substring_index(double value, int64_t len) {
    if (isnan(value) || value < 0) return 0;
    if (isinf(value)) return value < 0 ? 0 : len;
    if (value >= (double)len) return len;
    int64_t i = (int64_t)value;
    if (i < 0) return 0;
    return i;
}

tsc_str_t* tsc_str_substring(const tsc_str_t* s, double start, double end) {
    int64_t slen = (int64_t)s->len;
    int64_t i0 = substring_index(start, slen);
    int64_t i1 = substring_index(end, slen);
    if (i0 > i1) {
        int64_t t = i0;
        i0 = i1;
        i1 = t;
    }
    size_t n = (size_t)(i1 - i0);
    tsc_str_t* r = str_alloc(n);
    memcpy((char*)r->data, s->data + i0, n);
    return r;
}

tsc_str_t* tsc_str_to_upper(const tsc_str_t* s) {
    tsc_str_t* r = str_alloc(s->len);
    for (size_t i = 0; i < s->len; i++) {
        unsigned char c = (unsigned char)s->data[i];
        ((char*)r->data)[i] = (c < 0x80) ? (char)toupper(c) : (char)c;
    }
    return r;
}

tsc_str_t* tsc_str_to_lower(const tsc_str_t* s) {
    tsc_str_t* r = str_alloc(s->len);
    for (size_t i = 0; i < s->len; i++) {
        unsigned char c = (unsigned char)s->data[i];
        ((char*)r->data)[i] = (c < 0x80) ? (char)tolower(c) : (char)c;
    }
    return r;
}

tsc_str_t* tsc_str_normalize(const tsc_str_t* s, const tsc_str_t* form) {
    const UNormalizer2* normalizer = NULL;
    UErrorCode status = U_ZERO_ERROR;
    if (!form || str_lit_eq(form, "NFC")) {
        normalizer = unorm2_getNFCInstance(&status);
    } else if (str_lit_eq(form, "NFD")) {
        normalizer = unorm2_getNFDInstance(&status);
    } else if (str_lit_eq(form, "NFKC")) {
        normalizer = unorm2_getNFKCInstance(&status);
    } else if (str_lit_eq(form, "NFKD")) {
        normalizer = unorm2_getNFKDInstance(&status);
    } else {
        tsc_panic("String.normalize: form must be NFC, NFD, NFKC, or NFKD");
    }
    if (U_FAILURE(status) || !normalizer) {
        tsc_panic("String.normalize: ICU normalizer unavailable");
    }
    if (s->len > INT32_MAX) {
        tsc_panic("String.normalize: input too large");
    }

    int32_t ulen = 0;
    status = U_ZERO_ERROR;
    u_strFromUTF8(NULL, 0, &ulen, s->data, (int32_t)s->len, &status);
    if (status != U_BUFFER_OVERFLOW_ERROR && U_FAILURE(status)) {
        tsc_panic("String.normalize: invalid UTF-8 input");
    }

    UChar* ubuf = (UChar*)TSC_GC_MALLOC_ATOMIC(sizeof(UChar) * ((size_t)ulen + 1));
    status = U_ZERO_ERROR;
    u_strFromUTF8(ubuf, ulen + 1, NULL, s->data, (int32_t)s->len, &status);
    if (U_FAILURE(status)) {
        tsc_panic("String.normalize: UTF-8 conversion failed");
    }

    int32_t norm_len = 0;
    status = U_ZERO_ERROR;
    norm_len = unorm2_normalize(normalizer, ubuf, ulen, NULL, 0, &status);
    if (status != U_BUFFER_OVERFLOW_ERROR && U_FAILURE(status)) {
        tsc_panic("String.normalize: normalization sizing failed");
    }

    UChar* nbuf = (UChar*)TSC_GC_MALLOC_ATOMIC(sizeof(UChar) * ((size_t)norm_len + 1));
    status = U_ZERO_ERROR;
    norm_len = unorm2_normalize(normalizer, ubuf, ulen, nbuf, norm_len + 1, &status);
    if (U_FAILURE(status)) {
        tsc_panic("String.normalize: normalization failed");
    }

    int32_t out_len = 0;
    status = U_ZERO_ERROR;
    u_strToUTF8(NULL, 0, &out_len, nbuf, norm_len, &status);
    if (status != U_BUFFER_OVERFLOW_ERROR && U_FAILURE(status)) {
        tsc_panic("String.normalize: UTF-8 output sizing failed");
    }

    tsc_str_t* out = str_alloc((size_t)out_len);
    status = U_ZERO_ERROR;
    u_strToUTF8((char*)out->data, out_len + 1, NULL, nbuf, norm_len, &status);
    if (U_FAILURE(status)) {
        tsc_panic("String.normalize: UTF-8 output conversion failed");
    }
    return out;
}

tsc_str_t* tsc_str_trim(const tsc_str_t* s) {
    size_t i = 0, j = s->len;
    while (i < j && isspace((unsigned char)s->data[i])) i++;
    while (j > i && isspace((unsigned char)s->data[j - 1])) j--;
    tsc_str_t* r = str_alloc(j - i);
    memcpy((char*)r->data, s->data + i, j - i);
    return r;
}

tsc_str_t* tsc_str_trim_start(const tsc_str_t* s) {
    size_t i = 0;
    while (i < s->len && isspace((unsigned char)s->data[i])) i++;
    tsc_str_t* r = str_alloc(s->len - i);
    memcpy((char*)r->data, s->data + i, s->len - i);
    return r;
}

tsc_str_t* tsc_str_trim_end(const tsc_str_t* s) {
    size_t j = s->len;
    while (j > 0 && isspace((unsigned char)s->data[j - 1])) j--;
    tsc_str_t* r = str_alloc(j);
    memcpy((char*)r->data, s->data, j);
    return r;
}

tsc_str_t* tsc_str_repeat(const tsc_str_t* s, double n) {
    if (n <= 0 || isnan(n) || isinf(n)) return tsc_str_from_lit("", 0);
    size_t count = (size_t)n;
    tsc_str_t* r = str_alloc(s->len * count);
    for (size_t i = 0; i < count; i++) {
        memcpy((char*)r->data + i * s->len, s->data, s->len);
    }
    return r;
}

tsc_str_t* tsc_str_pad_start(const tsc_str_t* s, double target, const tsc_str_t* pad) {
    if (target <= (double)s->len || pad->len == 0) return (tsc_str_t*)s;
    size_t t = (size_t)target;
    size_t need = t - s->len;
    tsc_str_t* r = str_alloc(t);
    char* dst = (char*)r->data;
    size_t filled = 0;
    while (filled < need) {
        size_t chunk = (need - filled) < pad->len ? (need - filled) : pad->len;
        memcpy(dst + filled, pad->data, chunk);
        filled += chunk;
    }
    memcpy(dst + need, s->data, s->len);
    return r;
}

tsc_str_t* tsc_str_pad_end(const tsc_str_t* s, double target, const tsc_str_t* pad) {
    if (target <= (double)s->len || pad->len == 0) return (tsc_str_t*)s;
    size_t t = (size_t)target;
    size_t need = t - s->len;
    tsc_str_t* r = str_alloc(t);
    char* dst = (char*)r->data;
    memcpy(dst, s->data, s->len);
    size_t filled = 0;
    while (filled < need) {
        size_t chunk = (need - filled) < pad->len ? (need - filled) : pad->len;
        memcpy(dst + s->len + filled, pad->data, chunk);
        filled += chunk;
    }
    return r;
}

tsc_str_t* tsc_str_replace(const tsc_str_t* s, const tsc_str_t* search, const tsc_str_t* repl) {
    if (search->len == 0 || search->len > s->len) return (tsc_str_t*)s;
    for (size_t i = 0; i + search->len <= s->len; i++) {
        if (memcmp(s->data + i, search->data, search->len) == 0) {
            size_t new_len = s->len - search->len + repl->len;
            tsc_str_t* r = str_alloc(new_len);
            char* dst = (char*)r->data;
            memcpy(dst, s->data, i);
            memcpy(dst + i, repl->data, repl->len);
            memcpy(dst + i + repl->len, s->data + i + search->len,
                   s->len - i - search->len);
            return r;
        }
    }
    return (tsc_str_t*)s;
}

tsc_str_t* tsc_str_replace_all(const tsc_str_t* s, const tsc_str_t* search, const tsc_str_t* repl) {
    if (search->len == 0) return (tsc_str_t*)s;
    /* Count matches to allocate exact size. */
    size_t count = 0;
    size_t i = 0;
    while (i + search->len <= s->len) {
        if (memcmp(s->data + i, search->data, search->len) == 0) {
            count++;
            i += search->len;
        } else {
            i++;
        }
    }
    if (count == 0) return (tsc_str_t*)s;
    size_t new_len = s->len + count * (repl->len - search->len);
    /* If replacement is shorter and search longer, new_len could underflow; guard. */
    if (repl->len < search->len && count * (search->len - repl->len) > s->len) {
        new_len = 0;
    }
    tsc_str_t* r = str_alloc(new_len);
    char* dst = (char*)r->data;
    size_t src = 0, pos = 0;
    while (src < s->len) {
        if (src + search->len <= s->len &&
            memcmp(s->data + src, search->data, search->len) == 0) {
            memcpy(dst + pos, repl->data, repl->len);
            pos += repl->len;
            src += search->len;
        } else {
            dst[pos++] = s->data[src++];
        }
    }
    return r;
}

tsc_array_t* tsc_str_split(const tsc_str_t* s, const tsc_str_t* sep) {
    tsc_array_t* a = tsc_array_new(sizeof(tsc_str_t*), 4);
    if (sep->len == 0) {
        for (size_t i = 0; i < s->len; i++) {
            tsc_str_t* c = str_alloc(1);
            ((char*)c->data)[0] = s->data[i];
            tsc_array_push_raw(a, &c);
        }
        return a;
    }
    size_t i = 0;
    while (i <= s->len) {
        size_t found = s->len;
        for (size_t j = i; j + sep->len <= s->len; j++) {
            if (memcmp(s->data + j, sep->data, sep->len) == 0) {
                found = j;
                break;
            }
        }
        tsc_str_t* part = str_alloc(found - i);
        memcpy((char*)part->data, s->data + i, found - i);
        tsc_array_push_raw(a, &part);
        if (found == s->len) break;
        i = found + sep->len;
    }
    return a;
}

tsc_array_t* tsc_str_chars(const tsc_str_t* s) {
    tsc_array_t* a = tsc_array_new(sizeof(tsc_str_t*), s->len ? s->len : 1);
    size_t pos = 0;
    while (pos < s->len) {
        uint32_t cp = 0xfffd;
        size_t adv = 1;
        decode_utf8_at(s, pos, &cp, &adv);
        size_t len = utf8_len_for_code_point(cp);
        tsc_str_t* ch = str_alloc(len);
        write_utf8_code_point((char*)ch->data, cp);
        tsc_array_push_raw(a, &ch);
        pos += adv ? adv : 1;
    }
    return a;
}

/* ---------------- Symbol ---------------- */

typedef struct tsc_symbol_registry_entry {
    tsc_str_t* key;
    tsc_symbol_t* sym;
    struct tsc_symbol_registry_entry* next;
} tsc_symbol_registry_entry_t;

static uint64_t tsc_next_symbol_id = 1;
static tsc_symbol_registry_entry_t* tsc_symbol_registry = NULL;
static tsc_symbol_t* tsc_symbol_iterator_singleton = NULL;
static tsc_symbol_t* tsc_symbol_async_iterator_singleton = NULL;

tsc_symbol_t* tsc_symbol_new(const tsc_str_t* description) {
    tsc_symbol_t* sym = (tsc_symbol_t*)TSC_GC_MALLOC(sizeof(tsc_symbol_t));
    sym->id = tsc_next_symbol_id++;
    sym->description = (tsc_str_t*)description;
    sym->global_key = NULL;
    return sym;
}

tsc_symbol_t* tsc_symbol_for(const tsc_str_t* key) {
    for (tsc_symbol_registry_entry_t* e = tsc_symbol_registry; e; e = e->next) {
        if (tsc_str_eq(e->key, key)) return e->sym;
    }
    tsc_symbol_t* sym = tsc_symbol_new(key);
    sym->global_key = (tsc_str_t*)key;
    tsc_symbol_registry_entry_t* entry =
        (tsc_symbol_registry_entry_t*)TSC_GC_MALLOC(sizeof(tsc_symbol_registry_entry_t));
    entry->key = (tsc_str_t*)key;
    entry->sym = sym;
    entry->next = tsc_symbol_registry;
    tsc_symbol_registry = entry;
    return sym;
}

tsc_str_t* tsc_symbol_key_for(const tsc_symbol_t* sym) {
    return sym ? sym->global_key : NULL;
}

tsc_symbol_t* tsc_symbol_iterator(void) {
    if (!tsc_symbol_iterator_singleton) {
        tsc_symbol_iterator_singleton =
            tsc_symbol_new(tsc_str_from_lit("Symbol.iterator", 15));
    }
    return tsc_symbol_iterator_singleton;
}

tsc_symbol_t* tsc_symbol_async_iterator(void) {
    if (!tsc_symbol_async_iterator_singleton) {
        tsc_symbol_async_iterator_singleton =
            tsc_symbol_new(tsc_str_from_lit("Symbol.asyncIterator", 20));
    }
    return tsc_symbol_async_iterator_singleton;
}

tsc_str_t* tsc_symbol_description(const tsc_symbol_t* sym) {
    return sym ? sym->description : NULL;
}

tsc_str_t* tsc_symbol_to_string(const tsc_symbol_t* sym) {
    if (!sym || !sym->description) return tsc_str_from_lit("Symbol()", 8);
    return tsc_str_concat(
        tsc_str_concat(tsc_str_from_lit("Symbol(", 7), sym->description),
        tsc_str_from_lit(")", 1)
    );
}

/* ---------------- WeakRef ---------------- */

tsc_weakref_t* tsc_weakref_new(void* target) {
    tsc_weakref_t* ref = (tsc_weakref_t*)TSC_GC_MALLOC(sizeof(tsc_weakref_t));
    ref->target = target;
    return ref;
}

void* tsc_weakref_deref(const tsc_weakref_t* ref) {
    return ref ? ref->target : NULL;
}

/* ---------------- numbers ---------------- */

double tsc_num_mod(double a, double b) { return fmod(a, b); }

double tsc_parse_float(const tsc_str_t* s) {
    if (!s || s->len == 0) return NAN;
    char buf[64];
    size_t n = s->len < 63 ? s->len : 63;
    memcpy(buf, s->data, n);
    buf[n] = '\0';
    char* end;
    double v = strtod(buf, &end);
    if (end == buf) return NAN;
    return v;
}

double tsc_parse_int(const tsc_str_t* s, double radix) {
    if (!s || s->len == 0) return NAN;
    char buf[64];
    size_t n = s->len < 63 ? s->len : 63;
    memcpy(buf, s->data, n);
    buf[n] = '\0';
    int base = (int)radix;
    if (base == 0) base = 10;
    char* end;
    long v = strtol(buf, &end, base);
    if (end == buf) return NAN;
    return (double)v;
}

double tsc_math_random(void) {
    return (double)rand() / ((double)RAND_MAX + 1.0);
}

/* ---------------- BigInt (GMP-backed) ---------------- */

static tsc_bigint_t* bigint_alloc(void) {
    tsc_bigint_t* b = (tsc_bigint_t*)TSC_GC_MALLOC(sizeof(tsc_bigint_t));
    mpz_init(b->value);
    return b;
}

static const char* bigint_digits_for(const char* s, int* base) {
    if (!s) {
        *base = 10;
        return "";
    }
    const char* p = s;
    char sign = '\0';
    if (*p == '-' || *p == '+') {
        sign = *p;
        p++;
    }
    if (p[0] == '0' && (p[1] == 'x' || p[1] == 'X' || p[1] == 'o' || p[1] == 'O' || p[1] == 'b' || p[1] == 'B')) {
        *base = (p[1] == 'x' || p[1] == 'X') ? 16 : (p[1] == 'o' || p[1] == 'O') ? 8 : 2;
        p += 2;
        size_t len = strlen(p);
        char* out = (char*)TSC_GC_MALLOC_ATOMIC(len + (sign ? 2 : 1));
        size_t pos = 0;
        if (sign) out[pos++] = sign;
        memcpy(out + pos, p, len);
        out[pos + len] = '\0';
        return out;
    }
    *base = 10;
    return s;
}

tsc_bigint_t* tsc_bigint_from_lit(const char* lit) {
    tsc_bigint_t* b = bigint_alloc();
    int base = 10;
    const char* digits = bigint_digits_for(lit, &base);
    if (mpz_set_str(b->value, digits, base) != 0) {
        tsc_panic("BigInt: invalid literal");
    }
    return b;
}

tsc_bigint_t* tsc_bigint_from_str(const tsc_str_t* s) {
    char* c = cstr_dup(s);
    tsc_bigint_t* b = bigint_alloc();
    int base = 10;
    const char* digits = bigint_digits_for(c, &base);
    if (mpz_set_str(b->value, digits, base) != 0) {
        tsc_panic("BigInt: invalid string");
    }
    return b;
}

tsc_bigint_t* tsc_bigint_from_num(double n) {
    if (isnan(n) || isinf(n) || floor(n) != n) {
        tsc_panic("BigInt: number must be a finite integer");
    }
    tsc_bigint_t* b = bigint_alloc();
    mpz_set_d(b->value, n);
    return b;
}

tsc_bigint_t* tsc_bigint_from_bool(bool v) {
    tsc_bigint_t* b = bigint_alloc();
    mpz_set_ui(b->value, v ? 1u : 0u);
    return b;
}

tsc_bigint_t* tsc_bigint_neg(const tsc_bigint_t* a) {
    tsc_bigint_t* r = bigint_alloc();
    mpz_neg(r->value, a->value);
    return r;
}

tsc_bigint_t* tsc_bigint_add(const tsc_bigint_t* a, const tsc_bigint_t* b) {
    tsc_bigint_t* r = bigint_alloc();
    mpz_add(r->value, a->value, b->value);
    return r;
}

tsc_bigint_t* tsc_bigint_sub(const tsc_bigint_t* a, const tsc_bigint_t* b) {
    tsc_bigint_t* r = bigint_alloc();
    mpz_sub(r->value, a->value, b->value);
    return r;
}

tsc_bigint_t* tsc_bigint_mul(const tsc_bigint_t* a, const tsc_bigint_t* b) {
    tsc_bigint_t* r = bigint_alloc();
    mpz_mul(r->value, a->value, b->value);
    return r;
}

tsc_bigint_t* tsc_bigint_div(const tsc_bigint_t* a, const tsc_bigint_t* b) {
    if (mpz_sgn(b->value) == 0) tsc_panic("BigInt: division by zero");
    tsc_bigint_t* r = bigint_alloc();
    mpz_tdiv_q(r->value, a->value, b->value);
    return r;
}

tsc_bigint_t* tsc_bigint_mod(const tsc_bigint_t* a, const tsc_bigint_t* b) {
    if (mpz_sgn(b->value) == 0) tsc_panic("BigInt: modulo by zero");
    tsc_bigint_t* r = bigint_alloc();
    mpz_tdiv_r(r->value, a->value, b->value);
    return r;
}

tsc_bigint_t* tsc_bigint_pow(const tsc_bigint_t* a, const tsc_bigint_t* b) {
    if (mpz_sgn(b->value) < 0) tsc_panic("BigInt: negative exponent");
    if (!mpz_fits_ulong_p(b->value)) tsc_panic("BigInt: exponent too large");
    tsc_bigint_t* r = bigint_alloc();
    mpz_pow_ui(r->value, a->value, mpz_get_ui(b->value));
    return r;
}

int tsc_bigint_cmp(const tsc_bigint_t* a, const tsc_bigint_t* b) {
    return mpz_cmp(a->value, b->value);
}

bool tsc_bigint_eq(const tsc_bigint_t* a, const tsc_bigint_t* b) {
    return mpz_cmp(a->value, b->value) == 0;
}

tsc_str_t* tsc_bigint_to_string(const tsc_bigint_t* a, double radix) {
    int base = isnan(radix) || radix == 0.0 ? 10 : (int)radix;
    if (base < 2 || base > 36) tsc_panic("BigInt.toString: radix must be 2..36");
    char* raw = mpz_get_str(NULL, base, a->value);
    tsc_str_t* out = tsc_str_from_cstr(raw);
    free(raw);
    return out;
}

/* ---------------- RegExp (PCRE2-backed) ---------------- */

tsc_regexp_t* tsc_regexp_new(const tsc_str_t* pattern, const tsc_str_t* flags) {
    tsc_regexp_t* r = (tsc_regexp_t*)TSC_GC_MALLOC(sizeof(tsc_regexp_t));
    r->source = (tsc_str_t*)pattern;
    r->flags = (tsc_str_t*)flags;
    r->global = false;
    r->ignore_case = false;
    r->multiline = false;
    r->dot_all = false;
    r->unicode = false;
    r->compiled = false;
    r->capture_count = 0;
    if (flags) {
        for (size_t i = 0; i < flags->len; i++) {
            switch (flags->data[i]) {
                case 'g': r->global = true; break;
                case 'i': r->ignore_case = true; break;
                case 'm': r->multiline = true; break;
                case 's': r->dot_all = true; break;
                case 'u': r->unicode = true; break;
            }
        }
    }
    uint32_t opts = PCRE2_UTF | PCRE2_UCP;
    if (r->ignore_case) opts |= PCRE2_CASELESS;
    if (r->multiline) opts |= PCRE2_MULTILINE;
    if (r->dot_all) opts |= PCRE2_DOTALL;
    int error = 0;
    PCRE2_SIZE error_offset = 0;
    r->re = pcre2_compile((PCRE2_SPTR)pattern->data, pattern->len, opts, &error, &error_offset, NULL);
    if (r->re) {
        r->compiled = true;
        uint32_t captures = 0;
        if (pcre2_pattern_info(r->re, PCRE2_INFO_CAPTURECOUNT, &captures) == 0) {
            r->capture_count = captures;
        }
    }
    return r;
}

bool tsc_regexp_test(const tsc_regexp_t* re, const tsc_str_t* s) {
    if (!re->compiled) return false;
    pcre2_match_data* md = pcre2_match_data_create_from_pattern(re->re, NULL);
    int rc = pcre2_match(re->re, (PCRE2_SPTR)s->data, s->len, 0, 0, md, NULL);
    pcre2_match_data_free(md);
    return rc >= 0;
}

tsc_array_t* tsc_str_match_regex(const tsc_str_t* s, const tsc_regexp_t* re) {
    if (!re->compiled) return NULL;
    tsc_array_t* a = tsc_array_new(sizeof(tsc_str_t*), 4);
    pcre2_match_data* md = pcre2_match_data_create_from_pattern(re->re, NULL);
    size_t offset = 0;
    while (offset <= s->len) {
        int rc = pcre2_match(re->re, (PCRE2_SPTR)s->data, s->len, offset, offset == 0 ? 0 : PCRE2_NOTBOL, md, NULL);
        if (rc < 0) break;
        PCRE2_SIZE* ovec = pcre2_get_ovector_pointer(md);
        if (ovec[0] == PCRE2_UNSET) break;
        if (!re->global) {
            size_t nmatch = (size_t)rc;
            for (size_t i = 0; i < nmatch; i++) {
                tsc_str_t* part;
                if (ovec[2 * i] == PCRE2_UNSET) {
                    part = tsc_str_from_lit("", 0);
                } else {
                    size_t n = (size_t)(ovec[2 * i + 1] - ovec[2 * i]);
                    part = str_alloc(n);
                    memcpy((char*)part->data, s->data + ovec[2 * i], n);
                }
                tsc_array_push_raw(a, &part);
            }
            break;
        }
        size_t n = (size_t)(ovec[1] - ovec[0]);
        tsc_str_t* match = str_alloc(n);
        memcpy((char*)match->data, s->data + ovec[0], n);
        tsc_array_push_raw(a, &match);
        if (ovec[1] == ovec[0]) {
            if (offset < s->len) offset = (size_t)ovec[1] + 1;
            else break;
        } else {
            offset = (size_t)ovec[1];
        }
    }
    pcre2_match_data_free(md);
    return a->len > 0 ? a : NULL;
}

tsc_array_t* tsc_str_match_all_regex(const tsc_str_t* s, const tsc_regexp_t* re) {
    tsc_array_t* out = tsc_array_new(sizeof(tsc_array_t*), 4);
    if (!re->compiled) return out;
    pcre2_match_data* md = pcre2_match_data_create_from_pattern(re->re, NULL);
    size_t offset = 0;
    while (offset <= s->len) {
        int rc = pcre2_match(re->re, (PCRE2_SPTR)s->data, s->len, offset, offset == 0 ? 0 : PCRE2_NOTBOL, md, NULL);
        if (rc < 0) break;
        PCRE2_SIZE* ovec = pcre2_get_ovector_pointer(md);
        if (ovec[0] == PCRE2_UNSET) break;
        size_t nmatch = (size_t)rc;
        tsc_array_t* group = tsc_array_new(sizeof(tsc_str_t*), nmatch);
        for (size_t i = 0; i < nmatch; i++) {
            tsc_str_t* part;
            if (ovec[2 * i] == PCRE2_UNSET) {
                part = tsc_str_from_lit("", 0);
            } else {
                size_t n = (size_t)(ovec[2 * i + 1] - ovec[2 * i]);
                part = str_alloc(n);
                memcpy((char*)part->data, s->data + ovec[2 * i], n);
            }
            tsc_array_push_raw(group, &part);
        }
        tsc_array_push_raw(out, &group);
        if (ovec[1] == ovec[0]) {
            if (offset < s->len) offset = (size_t)ovec[1] + 1;
            else break;
        } else {
            offset = (size_t)ovec[1];
        }
    }
    pcre2_match_data_free(md);
    return out;
}

tsc_str_t* tsc_str_replace_regex(const tsc_str_t* s, const tsc_regexp_t* re, const tsc_str_t* repl) {
    if (!re->compiled) return (tsc_str_t*)s;
    size_t cap = s->len + 64;
    char* out = (char*)malloc(cap);
    size_t pos = 0;
    size_t offset = 0;
    pcre2_match_data* md = pcre2_match_data_create_from_pattern(re->re, NULL);
    while (offset <= s->len) {
        int rc = pcre2_match(re->re, (PCRE2_SPTR)s->data, s->len, offset, offset == 0 ? 0 : PCRE2_NOTBOL, md, NULL);
        if (rc < 0) {
            size_t n = s->len - offset;
            if (pos + n >= cap) { cap = pos + n + 32; out = (char*)realloc(out, cap); }
            memcpy(out + pos, s->data + offset, n);
            pos += n;
            break;
        }
        PCRE2_SIZE* ovec = pcre2_get_ovector_pointer(md);
        if (ovec[0] == PCRE2_UNSET) break;
        size_t pre = (size_t)ovec[0] - offset;
        if (pos + pre + repl->len >= cap) {
            cap = pos + pre + repl->len + 64;
            out = (char*)realloc(out, cap);
        }
        memcpy(out + pos, s->data + offset, pre); pos += pre;
        memcpy(out + pos, repl->data, repl->len); pos += repl->len;
        if (ovec[1] == ovec[0]) {
            if (ovec[1] < s->len) {
                if (pos + 1 >= cap) { cap *= 2; out = (char*)realloc(out, cap); }
                out[pos++] = s->data[ovec[1]];
                offset = (size_t)ovec[1] + 1;
            } else {
                break;
            }
        } else {
            offset = (size_t)ovec[1];
        }
        if (!re->global) {
            size_t n = s->len - offset;
            if (pos + n >= cap) { cap = pos + n + 32; out = (char*)realloc(out, cap); }
            memcpy(out + pos, s->data + offset, n);
            pos += n;
            break;
        }
    }
    pcre2_match_data_free(md);
    tsc_str_t* r = str_alloc(pos);
    memcpy((char*)r->data, out, pos);
    free(out);
    return r;
}

tsc_array_t* tsc_str_split_regex(const tsc_str_t* s, const tsc_regexp_t* re) {
    tsc_array_t* a = tsc_array_new(sizeof(tsc_str_t*), 4);
    if (!re->compiled) {
        tsc_str_t* copy = str_alloc(s->len);
        memcpy((char*)copy->data, s->data, s->len);
        tsc_array_push_raw(a, &copy);
        return a;
    }
    size_t offset = 0;
    pcre2_match_data* md = pcre2_match_data_create_from_pattern(re->re, NULL);
    while (offset <= s->len) {
        int rc = pcre2_match(re->re, (PCRE2_SPTR)s->data, s->len, offset, offset == 0 ? 0 : PCRE2_NOTBOL, md, NULL);
        if (rc < 0) break;
        PCRE2_SIZE* ovec = pcre2_get_ovector_pointer(md);
        if (ovec[0] == PCRE2_UNSET) break;
        size_t pre = (size_t)ovec[0] - offset;
        tsc_str_t* part = str_alloc(pre);
        if (pre > 0) memcpy((char*)part->data, s->data + offset, pre);
        tsc_array_push_raw(a, &part);
        if (ovec[1] == ovec[0]) {
            if (ovec[1] < s->len) offset = (size_t)ovec[1] + 1;
            else break;
        } else {
            offset = (size_t)ovec[1];
        }
    }
    size_t n = s->len - offset;
    tsc_str_t* tail = str_alloc(n);
    if (n > 0) memcpy((char*)tail->data, s->data + offset, n);
    tsc_array_push_raw(a, &tail);
    pcre2_match_data_free(md);
    return a;
}

/* ---------------- crypto ---------------- */

struct tsc_hash {
    SHA256_CTX ctx;
    bool finalized;
    unsigned char digest[SHA256_DIGEST_LENGTH];
};

tsc_hash_t* tsc_crypto_create_hash(const tsc_str_t* algorithm) {
    if (!str_lit_eq(algorithm, "sha256")) {
        tsc_panic("crypto.createHash: only sha256 is supported");
    }
    tsc_hash_t* h = (tsc_hash_t*)TSC_GC_MALLOC(sizeof(tsc_hash_t));
    SHA256_Init(&h->ctx);
    h->finalized = false;
    memset(h->digest, 0, sizeof h->digest);
    return h;
}

tsc_hash_t* tsc_hash_update(tsc_hash_t* h, const tsc_str_t* data) {
    if (!h->finalized) {
        SHA256_Update(&h->ctx, data->data, data->len);
    }
    return h;
}

tsc_str_t* tsc_hash_digest(tsc_hash_t* h, const tsc_str_t* encoding) {
    if (!str_lit_eq(encoding, "hex")) {
        tsc_panic("Hash.digest: only hex encoding is supported");
    }
    if (!h->finalized) {
        SHA256_Final(h->digest, &h->ctx);
        h->finalized = true;
    }
    static const char hex[] = "0123456789abcdef";
    tsc_str_t* out = str_alloc(SHA256_DIGEST_LENGTH * 2);
    char* p = (char*)out->data;
    for (size_t i = 0; i < SHA256_DIGEST_LENGTH; i++) {
        p[i * 2] = hex[h->digest[i] >> 4];
        p[i * 2 + 1] = hex[h->digest[i] & 0x0f];
    }
    return out;
}

/* ---------------- URL ---------------- */

static tsc_str_t* str_from_range(const char* data, size_t start, size_t end) {
    if (end < start) end = start;
    tsc_str_t* out = str_alloc(end - start);
    if (end > start) memcpy((char*)out->data, data + start, end - start);
    return out;
}

static size_t find_byte(const char* data, size_t start, size_t end, char needle) {
    for (size_t i = start; i < end; i++) {
        if (data[i] == needle) return i;
    }
    return (size_t)-1;
}

static size_t first_of_url_tail(const char* data, size_t start, size_t end) {
    for (size_t i = start; i < end; i++) {
        if (data[i] == '/' || data[i] == '?' || data[i] == '#') return i;
    }
    return end;
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
    if (scheme_colon == (size_t)-1 || scheme_colon + 2 >= n ||
        d[scheme_colon + 1] != '/' || d[scheme_colon + 2] != '/') {
        tsc_panic("URL: only absolute URLs with // authority are supported");
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

/* ---------------- JSON helpers ---------------- */

tsc_str_t* tsc_json_escape_string(const tsc_str_t* s) {
    /* Upper bound: 6x expansion for \uXXXX of every byte. */
    size_t cap = s->len * 6 + 3;
    tsc_str_t* out = (tsc_str_t*)TSC_GC_MALLOC(sizeof(tsc_str_t));
    char* buf = (char*)TSC_GC_MALLOC_ATOMIC(cap);
    size_t pos = 0;
    buf[pos++] = '"';
    for (size_t i = 0; i < s->len; i++) {
        unsigned char c = (unsigned char)s->data[i];
        switch (c) {
            case '"':  buf[pos++] = '\\'; buf[pos++] = '"'; break;
            case '\\': buf[pos++] = '\\'; buf[pos++] = '\\'; break;
            case '\n': buf[pos++] = '\\'; buf[pos++] = 'n'; break;
            case '\r': buf[pos++] = '\\'; buf[pos++] = 'r'; break;
            case '\t': buf[pos++] = '\\'; buf[pos++] = 't'; break;
            case '\b': buf[pos++] = '\\'; buf[pos++] = 'b'; break;
            case '\f': buf[pos++] = '\\'; buf[pos++] = 'f'; break;
            default:
                if (c < 0x20) {
                    pos += (size_t)snprintf(buf + pos, cap - pos, "\\u%04x", c);
                } else {
                    buf[pos++] = (char)c;
                }
        }
    }
    buf[pos++] = '"';
    buf[pos] = '\0';
    out->data = buf;
    out->len = pos;
    return out;
}

tsc_str_t* tsc_json_num(double n) {
    /* NaN and Infinity are invalid in JSON — emit "null" (matches JS). */
    if (isnan(n) || isinf(n)) return tsc_str_from_lit("null", 4);
    return tsc_str_from_num(n);
}

/* ---------------- arrays ---------------- */

tsc_array_t* tsc_array_new(size_t elem_size, size_t initial_cap) {
    tsc_array_t* a = (tsc_array_t*)TSC_GC_MALLOC(sizeof(tsc_array_t));
    a->len = 0;
    a->cap = initial_cap;
    a->es = elem_size;
    a->data = initial_cap ? TSC_GC_MALLOC(initial_cap * elem_size) : NULL;
    return a;
}

tsc_array_t* tsc_array_from_buf(size_t elem_size, const void* src, size_t n) {
    tsc_array_t* a = tsc_array_new(elem_size, n > 0 ? n : 1);
    if (n > 0) memcpy(a->data, src, n * elem_size);
    a->len = n;
    return a;
}

void tsc_array_reserve(tsc_array_t* a, size_t new_cap) {
    if (new_cap <= a->cap) return;
    size_t cap = a->cap ? a->cap : 1;
    while (cap < new_cap) cap *= 2;
    void* nd = TSC_GC_MALLOC(cap * a->es);
    if (a->data && a->len > 0) memcpy(nd, a->data, a->len * a->es);
    a->data = nd;
    a->cap = cap;
}

void tsc_array_push_raw(tsc_array_t* a, const void* elem) {
    if (a->len + 1 > a->cap) tsc_array_reserve(a, a->len + 1);
    memcpy((char*)a->data + a->len * a->es, elem, a->es);
    a->len++;
}

void tsc_array_pop_raw(tsc_array_t* a) {
    if (a->len > 0) a->len--;
}

void tsc_array_shift_raw(tsc_array_t* a) {
    if (a->len == 0) return;
    memmove(a->data, (char*)a->data + a->es, (a->len - 1) * a->es);
    a->len--;
}

void tsc_array_unshift_raw(tsc_array_t* a, const void* elem) {
    if (a->len + 1 > a->cap) tsc_array_reserve(a, a->len + 1);
    memmove((char*)a->data + a->es, a->data, a->len * a->es);
    memcpy(a->data, elem, a->es);
    a->len++;
}

tsc_array_t* tsc_array_reverse(tsc_array_t* a) {
    if (a->len < 2) return a;
    char* lo = (char*)a->data;
    char* hi = lo + (a->len - 1) * a->es;
    char tmp[256]; /* element size limit for stack swap; larger uses heap */
    char* swap = a->es <= sizeof(tmp) ? tmp : (char*)TSC_GC_MALLOC(a->es);
    while (lo < hi) {
        memcpy(swap, lo, a->es);
        memcpy(lo, hi, a->es);
        memcpy(hi, swap, a->es);
        lo += a->es;
        hi -= a->es;
    }
    return a;
}

tsc_array_t* tsc_array_to_reversed(const tsc_array_t* a) {
    return tsc_array_reverse(tsc_array_slice(a, 0.0, (double)a->len));
}

static int64_t array_strict_index(double value, int64_t len) {
    if (isnan(value)) value = 0.0;
    if (isinf(value)) tsc_panic("Array.with index out of range");
    if (value < 0) value = (double)len + value;
    if (value < 0 || value >= (double)len) {
        tsc_panic("Array.with index out of range");
    }
    return (int64_t)value;
}

tsc_array_t* tsc_array_with(const tsc_array_t* a, double index, const void* elem) {
    int64_t at = array_strict_index(index, (int64_t)a->len);
    tsc_array_t* copy = tsc_array_slice(a, 0.0, (double)a->len);
    memcpy((char*)copy->data + (size_t)at * copy->es, elem, copy->es);
    return copy;
}

static int64_t array_range_index(double value, int64_t len, double fallback) {
    double n = isnan(value) ? fallback : value;
    if (isnan(n)) n = 0.0;
    if (isinf(n)) return n < 0 ? 0 : len;
    if (n < 0) n = (double)len + n;
    if (n < 0) return 0;
    if (n >= (double)len) return len;
    return (int64_t)n;
}

tsc_array_t* tsc_array_to_spliced(const tsc_array_t* a, double start, double delete_count, int argc, const tsc_array_t* items) {
    int64_t len = (int64_t)a->len;
    int64_t at = argc <= 0 ? 0 : array_range_index(start, len, 0.0);
    int64_t del = 0;
    if (argc == 1) {
        del = len - at;
    } else if (argc >= 2) {
        double raw = isnan(delete_count) || delete_count < 0 ? 0.0 : delete_count;
        if (isinf(raw)) raw = raw < 0 ? 0.0 : (double)(len - at);
        del = (int64_t)raw;
        if (del > len - at) del = len - at;
    }

    size_t insert_len = items ? items->len : 0;
    size_t new_len = a->len - (size_t)del + insert_len;
    tsc_array_t* out = tsc_array_new(a->es, new_len > 0 ? new_len : 1);
    if (at > 0) {
        memcpy(out->data, a->data, (size_t)at * a->es);
        out->len = (size_t)at;
    }
    if (insert_len > 0) {
        memcpy((char*)out->data + out->len * out->es, items->data, insert_len * out->es);
        out->len += insert_len;
    }
    size_t tail_start = (size_t)(at + del);
    size_t tail_len = a->len - tail_start;
    if (tail_len > 0) {
        memcpy((char*)out->data + out->len * out->es, (char*)a->data + tail_start * a->es, tail_len * a->es);
        out->len += tail_len;
    }
    return out;
}

tsc_array_t* tsc_array_fill(tsc_array_t* a, const void* elem, double start, double end) {
    int64_t len = (int64_t)a->len;
    int64_t i0 = array_range_index(start, len, 0.0);
    int64_t i1 = array_range_index(end, len, (double)len);
    if (i1 < i0) i1 = i0;
    for (int64_t i = i0; i < i1; i++) {
        memcpy((char*)a->data + (size_t)i * a->es, elem, a->es);
    }
    return a;
}

tsc_array_t* tsc_array_copy_within(tsc_array_t* a, double target, double start, double end) {
    int64_t len = (int64_t)a->len;
    int64_t to = array_range_index(target, len, 0.0);
    int64_t from = array_range_index(start, len, 0.0);
    int64_t final = array_range_index(end, len, (double)len);
    int64_t count = final - from;
    int64_t room = len - to;
    if (count > room) count = room;
    if (count > 0) {
        memmove(
            (char*)a->data + (size_t)to * a->es,
            (char*)a->data + (size_t)from * a->es,
            (size_t)count * a->es
        );
    }
    return a;
}

tsc_array_t* tsc_array_slice(const tsc_array_t* a, double start, double end) {
    int64_t slen = (int64_t)a->len;
    int64_t i0 = (int64_t)start;
    int64_t i1 = (int64_t)end;
    if (i0 < 0) i0 = slen + i0;
    if (i1 < 0) i1 = slen + i1;
    if (i0 < 0) i0 = 0;
    if (i1 > slen) i1 = slen;
    if (i0 > i1) i0 = i1;
    size_t n = (size_t)(i1 - i0);
    tsc_array_t* r = tsc_array_new(a->es, n > 0 ? n : 1);
    if (n > 0) memcpy(r->data, (char*)a->data + (size_t)i0 * a->es, n * a->es);
    r->len = n;
    return r;
}

tsc_array_t* tsc_array_append(tsc_array_t* dst, const tsc_array_t* src) {
    if (src->len == 0) return dst;
    tsc_array_reserve(dst, dst->len + src->len);
    memcpy((char*)dst->data + dst->len * dst->es, src->data, src->len * src->es);
    dst->len += src->len;
    return dst;
}

tsc_array_t* tsc_array_flat_once(const tsc_array_t* outer, size_t elem_size) {
    tsc_array_t* dst = tsc_array_new(elem_size, outer->len);
    for (size_t i = 0; i < outer->len; i++) {
        tsc_array_t* inner = TSC_ARR(tsc_array_t*, outer, i);
        if (inner) tsc_array_append(dst, inner);
    }
    return dst;
}

double tsc_array_length(const tsc_array_t* a) { return (double)a->len; }

void tsc_array_oob(const tsc_array_t* a, double i) { (void)a; (void)i; }

/* ---------------- Buffer ---------------- */

static uint8_t byte_from_double(double n) {
    if (isnan(n) || isinf(n)) return 0;
    int64_t i = (int64_t)n;
    return (uint8_t)(i & 0xff);
}

static tsc_buffer_t* buffer_alloc_len(size_t len) {
    tsc_buffer_t* b = (tsc_buffer_t*)TSC_GC_MALLOC(sizeof(tsc_buffer_t));
    b->len = len;
    b->data = (uint8_t*)TSC_GC_MALLOC_ATOMIC(len ? len : 1);
    if (len == 0) b->data[0] = 0;
    return b;
}

static int hex_value(unsigned char c) {
    if (c >= '0' && c <= '9') return (int)(c - '0');
    if (c >= 'a' && c <= 'f') return 10 + (int)(c - 'a');
    if (c >= 'A' && c <= 'F') return 10 + (int)(c - 'A');
    return -1;
}

static size_t buffer_index(double raw, size_t len) {
    int64_t i = (int64_t)raw;
    if (i < 0) i = (int64_t)len + i;
    if (i < 0) i = 0;
    if ((size_t)i > len) i = (int64_t)len;
    return (size_t)i;
}

tsc_buffer_t* tsc_buffer_from_str(const tsc_str_t* input, const tsc_str_t* encoding) {
    if (!encoding || str_lit_eq(encoding, "utf8")) {
        tsc_buffer_t* b = buffer_alloc_len(input->len);
        if (input->len > 0) memcpy(b->data, input->data, input->len);
        return b;
    }
    if (str_lit_eq(encoding, "hex")) {
        if ((input->len % 2) != 0) tsc_panic("Buffer.from hex input must have even length");
        tsc_buffer_t* b = buffer_alloc_len(input->len / 2);
        for (size_t i = 0; i < b->len; i++) {
            int hi = hex_value((unsigned char)input->data[i * 2]);
            int lo = hex_value((unsigned char)input->data[i * 2 + 1]);
            if (hi < 0 || lo < 0) tsc_panic("Buffer.from hex input contains non-hex digit");
            b->data[i] = (uint8_t)((hi << 4) | lo);
        }
        return b;
    }
    tsc_panic("Buffer.from: only utf8 and hex encodings are supported");
    return NULL;
}

tsc_buffer_t* tsc_buffer_from_array(const tsc_array_t* input) {
    tsc_buffer_t* b = buffer_alloc_len(input->len);
    for (size_t i = 0; i < input->len; i++) {
        double n = TSC_ARR(double, input, i);
        b->data[i] = byte_from_double(n);
    }
    return b;
}

tsc_buffer_t* tsc_buffer_alloc(double size, double fill) {
    if (isnan(size) || isinf(size) || size < 0) {
        tsc_panic("Buffer.alloc size must be a non-negative finite number");
    }
    size_t len = (size_t)size;
    uint8_t byte = byte_from_double(fill);
    tsc_buffer_t* b = buffer_alloc_len(len);
    if (len > 0) memset(b->data, byte, len);
    return b;
}

tsc_buffer_t* tsc_buffer_concat(const tsc_array_t* list) {
    size_t total = 0;
    for (size_t i = 0; i < list->len; i++) {
        tsc_buffer_t* part = TSC_ARR(tsc_buffer_t*, list, i);
        if (part) total += part->len;
    }
    tsc_buffer_t* out = buffer_alloc_len(total);
    size_t pos = 0;
    for (size_t i = 0; i < list->len; i++) {
        tsc_buffer_t* part = TSC_ARR(tsc_buffer_t*, list, i);
        if (!part || part->len == 0) continue;
        memcpy(out->data + pos, part->data, part->len);
        pos += part->len;
    }
    return out;
}

tsc_str_t* tsc_buffer_to_string(const tsc_buffer_t* b, const tsc_str_t* encoding) {
    if (!encoding || str_lit_eq(encoding, "utf8")) {
        tsc_str_t* out = str_alloc(b->len);
        if (b->len > 0) memcpy((char*)out->data, b->data, b->len);
        return out;
    }
    if (str_lit_eq(encoding, "hex")) {
        static const char hex[] = "0123456789abcdef";
        tsc_str_t* out = str_alloc(b->len * 2);
        char* p = (char*)out->data;
        for (size_t i = 0; i < b->len; i++) {
            p[i * 2] = hex[b->data[i] >> 4];
            p[i * 2 + 1] = hex[b->data[i] & 0x0f];
        }
        return out;
    }
    tsc_panic("Buffer.toString: only utf8 and hex encodings are supported");
    return NULL;
}

tsc_buffer_t* tsc_buffer_slice(const tsc_buffer_t* b, double start, double end) {
    size_t i0 = buffer_index(start, b->len);
    size_t i1 = buffer_index(end, b->len);
    if (i0 > i1) i0 = i1;
    size_t n = i1 - i0;
    tsc_buffer_t* out = buffer_alloc_len(n);
    if (n > 0) memcpy(out->data, b->data + i0, n);
    return out;
}

bool tsc_buffer_equals(const tsc_buffer_t* a, const tsc_buffer_t* b) {
    if (a == b) return true;
    if (!a || !b || a->len != b->len) return false;
    return a->len == 0 || memcmp(a->data, b->data, a->len) == 0;
}

double tsc_buffer_length(const tsc_buffer_t* b) { return (double)b->len; }

double tsc_buffer_get(const tsc_buffer_t* b, double idx) {
    if (isnan(idx) || isinf(idx) || idx < 0 || (size_t)idx >= b->len) return NAN;
    return (double)b->data[(size_t)idx];
}

/* ---------------- dynamic values (NaN-boxed) ---------------- */

#define TSC_VALUE_BOX_MASK UINT64_C(0x7ffc000000000000)
#define TSC_VALUE_PAYLOAD_MASK UINT64_C(0x0000ffffffffffff)

typedef enum {
    TSC_VALUE_TAG_UNDEFINED = 1,
    TSC_VALUE_TAG_NULL = 2,
    TSC_VALUE_TAG_FALSE = 3,
    TSC_VALUE_TAG_TRUE = 4,
    TSC_VALUE_TAG_STRING = 5,
    TSC_VALUE_TAG_ARRAY = 6,
    TSC_VALUE_TAG_OBJECT = 7,
} tsc_value_tag_t;

typedef struct tsc_object_prop {
    tsc_str_t* key;
    tsc_value_t value;
    bool accessor;
    tsc_accessor_getter_t getter;
    tsc_accessor_setter_t setter;
    bool writable;
    bool enumerable;
    bool configurable;
} tsc_object_prop_t;

struct tsc_object {
    size_t len;
    size_t cap;
    bool extensible;
    tsc_value_t prototype;
    tsc_object_prop_t* props;
};

static tsc_value_t value_box(tsc_value_tag_t tag, uintptr_t payload) {
    return TSC_VALUE_BOX_MASK | ((uint64_t)payload & TSC_VALUE_PAYLOAD_MASK) | (uint64_t)tag;
}

static bool value_is_box(tsc_value_t v) {
    return (v & TSC_VALUE_BOX_MASK) == TSC_VALUE_BOX_MASK;
}

static tsc_value_tag_t value_tag(tsc_value_t v) {
    return (tsc_value_tag_t)(v & 0x7);
}

static void* value_ptr(tsc_value_t v) {
    return (void*)(uintptr_t)((v & TSC_VALUE_PAYLOAD_MASK) & ~UINT64_C(0x7));
}

static bool value_is_null_value(tsc_value_t v) {
    return value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_NULL;
}

static bool value_is_object_value(tsc_value_t v) {
    return value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_OBJECT;
}

static bool value_is_valid_prototype(tsc_value_t v) {
    return value_is_null_value(v) || value_is_object_value(v);
}

tsc_value_t tsc_value_undefined(void) { return value_box(TSC_VALUE_TAG_UNDEFINED, 0); }
tsc_value_t tsc_value_null(void) { return value_box(TSC_VALUE_TAG_NULL, 0); }
tsc_value_t tsc_value_bool(bool b) { return value_box(b ? TSC_VALUE_TAG_TRUE : TSC_VALUE_TAG_FALSE, 0); }

tsc_value_t tsc_value_num(double n) {
    tsc_value_t v;
    memcpy(&v, &n, sizeof v);
    return v;
}

tsc_value_t tsc_value_string(tsc_str_t* s) { return value_box(TSC_VALUE_TAG_STRING, (uintptr_t)s); }
tsc_value_t tsc_value_array(tsc_array_t* a) { return value_box(TSC_VALUE_TAG_ARRAY, (uintptr_t)a); }
tsc_value_t tsc_value_object(tsc_object_t* o) { return value_box(TSC_VALUE_TAG_OBJECT, (uintptr_t)o); }

static double value_as_num(tsc_value_t v) {
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

tsc_str_t* tsc_value_typeof(tsc_value_t v) {
    if (!value_is_box(v)) return tsc_str_from_lit("number", 6);
    switch (value_tag(v)) {
        case TSC_VALUE_TAG_UNDEFINED: return tsc_str_from_lit("undefined", 9);
        case TSC_VALUE_TAG_NULL: return tsc_str_from_lit("object", 6);
        case TSC_VALUE_TAG_FALSE:
        case TSC_VALUE_TAG_TRUE: return tsc_str_from_lit("boolean", 7);
        case TSC_VALUE_TAG_STRING: return tsc_str_from_lit("string", 6);
        case TSC_VALUE_TAG_ARRAY:
        case TSC_VALUE_TAG_OBJECT: return tsc_str_from_lit("object", 6);
    }
    return tsc_str_from_lit("undefined", 9);
}

tsc_str_t* tsc_value_to_string(tsc_value_t v) {
    if (!value_is_box(v)) return tsc_str_from_num(value_as_num(v));
    switch (value_tag(v)) {
        case TSC_VALUE_TAG_UNDEFINED: return tsc_str_from_lit("undefined", 9);
        case TSC_VALUE_TAG_NULL: return tsc_str_from_lit("null", 4);
        case TSC_VALUE_TAG_FALSE: return tsc_str_from_lit("false", 5);
        case TSC_VALUE_TAG_TRUE: return tsc_str_from_lit("true", 4);
        case TSC_VALUE_TAG_STRING: return (tsc_str_t*)value_ptr(v);
        case TSC_VALUE_TAG_ARRAY: {
            tsc_value_t joined = tsc_value_method_join(v, tsc_value_undefined());
            return tsc_value_as_string(joined);
        }
        case TSC_VALUE_TAG_OBJECT: return tsc_str_from_lit("[object Object]", 15);
    }
    return tsc_str_from_lit("undefined", 9);
}

bool tsc_value_is_nullish(tsc_value_t v) {
    if (!value_is_box(v)) return false;
    tsc_value_tag_t tag = value_tag(v);
    return tag == TSC_VALUE_TAG_UNDEFINED || tag == TSC_VALUE_TAG_NULL;
}

bool tsc_value_is_array(tsc_value_t v) {
    return value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_ARRAY;
}

tsc_value_t tsc_value_get_prop(tsc_value_t v, const tsc_str_t* key) {
    if (!value_is_box(v)) return tsc_value_undefined();
    if (value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        return tsc_object_get((tsc_object_t*)value_ptr(v), key);
    }
    return tsc_value_undefined();
}

tsc_value_t tsc_value_get_index(tsc_value_t v, double index) {
    if (!value_is_box(v)) return tsc_value_undefined();
    if (value_tag(v) != TSC_VALUE_TAG_ARRAY) return tsc_value_undefined();
    tsc_array_t* a = (tsc_array_t*)value_ptr(v);
    if (isnan(index) || isinf(index) || index < 0 || (size_t)index >= a->len) {
        return tsc_value_undefined();
    }
    return TSC_ARR(tsc_value_t, a, (size_t)index);
}

bool tsc_value_set_index(tsc_value_t v, double index, tsc_value_t value) {
    if (!value_is_box(v) || value_tag(v) != TSC_VALUE_TAG_ARRAY) return false;
    if (isnan(index) || isinf(index) || index < 0 || floor(index) != index) return false;
    tsc_array_t* a = (tsc_array_t*)value_ptr(v);
    size_t idx = (size_t)index;
    while (a->len < idx) {
        tsc_value_t undef = tsc_value_undefined();
        tsc_array_push_raw(a, &undef);
    }
    if (idx == a->len) {
        tsc_array_push_raw(a, &value);
    } else {
        TSC_ARR(tsc_value_t, a, idx) = value;
    }
    return true;
}

tsc_value_t tsc_value_define_property(tsc_value_t v, tsc_str_t* key, tsc_value_t value) {
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        tsc_object_define((tsc_object_t*)value_ptr(v), key, value, false, false, false);
    }
    return v;
}

bool tsc_value_define_property_desc(tsc_value_t v, tsc_str_t* key, tsc_value_t value, bool writable, bool enumerable, bool configurable) {
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        return tsc_object_define((tsc_object_t*)value_ptr(v), key, value, writable, enumerable, configurable);
    }
    return false;
}

bool tsc_value_define_accessor_desc(tsc_value_t v, tsc_str_t* key, tsc_accessor_getter_t getter, tsc_accessor_setter_t setter, bool enumerable, bool configurable) {
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        return tsc_object_define_accessor((tsc_object_t*)value_ptr(v), key, getter, setter, enumerable, configurable);
    }
    return false;
}

tsc_value_t tsc_value_object_create(tsc_value_t prototype) {
    if (!value_is_valid_prototype(prototype)) {
        tsc_panic("Object.create prototype must be an object or null");
    }
    tsc_object_t* o = tsc_object_new();
    o->prototype = prototype;
    return tsc_value_object(o);
}

bool tsc_value_is_prototype_of(tsc_value_t prototype, tsc_value_t object) {
    if (
        value_is_box(prototype) &&
        value_tag(prototype) == TSC_VALUE_TAG_OBJECT &&
        value_is_box(object) &&
        value_tag(object) == TSC_VALUE_TAG_OBJECT
    ) {
        return tsc_object_is_prototype_of(
            (tsc_object_t*)value_ptr(prototype),
            (tsc_object_t*)value_ptr(object)
        );
    }
    return false;
}

tsc_value_t tsc_value_get_prototype_of(tsc_value_t v) {
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        return tsc_object_get_prototype_of((tsc_object_t*)value_ptr(v));
    }
    return tsc_value_undefined();
}

bool tsc_value_set_prototype_of(tsc_value_t v, tsc_value_t prototype) {
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        return tsc_object_set_prototype_of((tsc_object_t*)value_ptr(v), prototype);
    }
    return false;
}

bool tsc_value_set_prop(tsc_value_t v, tsc_str_t* key, tsc_value_t value) {
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        return tsc_object_set((tsc_object_t*)value_ptr(v), key, value);
    }
    return false;
}

bool tsc_value_has_own_prop(tsc_value_t v, const tsc_str_t* key) {
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        return tsc_object_has_own((tsc_object_t*)value_ptr(v), key);
    }
    return false;
}

bool tsc_value_property_is_enumerable(tsc_value_t v, const tsc_str_t* key) {
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        return tsc_object_property_is_enumerable((tsc_object_t*)value_ptr(v), key);
    }
    return false;
}

bool tsc_value_has_prop(tsc_value_t v, const tsc_str_t* key) {
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        return tsc_object_has((tsc_object_t*)value_ptr(v), key);
    }
    return false;
}

bool tsc_value_delete_prop(tsc_value_t v, tsc_str_t* key) {
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        return tsc_object_delete((tsc_object_t*)value_ptr(v), key);
    }
    return true;
}

bool tsc_value_is_extensible(tsc_value_t v) {
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        return tsc_object_is_extensible((tsc_object_t*)value_ptr(v));
    }
    return false;
}

bool tsc_value_prevent_extensions(tsc_value_t v) {
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        return tsc_object_prevent_extensions((tsc_object_t*)value_ptr(v));
    }
    return false;
}

bool tsc_value_seal(tsc_value_t v) {
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        return tsc_object_seal((tsc_object_t*)value_ptr(v));
    }
    return false;
}

bool tsc_value_freeze(tsc_value_t v) {
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        return tsc_object_freeze((tsc_object_t*)value_ptr(v));
    }
    return false;
}

bool tsc_value_is_sealed(tsc_value_t v) {
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        return tsc_object_is_sealed((tsc_object_t*)value_ptr(v));
    }
    return false;
}

bool tsc_value_is_frozen(tsc_value_t v) {
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        return tsc_object_is_frozen((tsc_object_t*)value_ptr(v));
    }
    return false;
}

tsc_array_t* tsc_value_own_keys(tsc_value_t v) {
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        return tsc_object_own_keys_dyn((tsc_object_t*)value_ptr(v));
    }
    return tsc_array_new(sizeof(tsc_str_t*), 1);
}

static tsc_value_t value_descriptor_from_prop(const tsc_object_prop_t* prop) {
    tsc_object_t* desc = tsc_object_new();
    if (prop->accessor) {
        if (prop->getter) {
            tsc_object_set(desc, tsc_str_from_lit("get", 3), tsc_value_string(tsc_str_from_lit("[function]", 10)));
        }
        if (prop->setter) {
            tsc_object_set(desc, tsc_str_from_lit("set", 3), tsc_value_string(tsc_str_from_lit("[function]", 10)));
        }
    } else {
        tsc_object_set(desc, tsc_str_from_lit("value", 5), prop->value);
        tsc_object_set(desc, tsc_str_from_lit("writable", 8), tsc_value_bool(prop->writable));
    }
    tsc_object_set(desc, tsc_str_from_lit("enumerable", 10), tsc_value_bool(prop->enumerable));
    tsc_object_set(desc, tsc_str_from_lit("configurable", 12), tsc_value_bool(prop->configurable));
    return tsc_value_object(desc);
}

tsc_value_t tsc_value_get_own_property_descriptor(tsc_value_t v, tsc_str_t* key) {
    if (!value_is_box(v) || value_tag(v) != TSC_VALUE_TAG_OBJECT) return tsc_value_undefined();
    tsc_object_t* o = (tsc_object_t*)value_ptr(v);
    for (size_t i = 0; i < o->len; i++) {
        if (!tsc_str_eq(o->props[i].key, key)) continue;
        return value_descriptor_from_prop(&o->props[i]);
    }
    return tsc_value_undefined();
}

tsc_value_t tsc_value_get_own_property_descriptors(tsc_value_t v) {
    if (!value_is_box(v) || value_tag(v) != TSC_VALUE_TAG_OBJECT) return tsc_value_undefined();
    tsc_object_t* o = (tsc_object_t*)value_ptr(v);
    tsc_object_t* out = tsc_object_new();
    for (size_t i = 0; i < o->len; i++) {
        tsc_value_t desc = value_descriptor_from_prop(&o->props[i]);
        tsc_object_set(out, o->props[i].key, desc);
    }
    return tsc_value_object(out);
}

tsc_value_t tsc_value_object_assign(tsc_value_t target, tsc_value_t source) {
    if (!value_is_box(target) || value_tag(target) != TSC_VALUE_TAG_OBJECT) return target;
    if (!value_is_box(source) || value_tag(source) != TSC_VALUE_TAG_OBJECT) return target;
    tsc_object_t* dst = (tsc_object_t*)value_ptr(target);
    tsc_object_t* src = (tsc_object_t*)value_ptr(source);
    for (size_t i = 0; i < src->len; i++) {
        if (!src->props[i].enumerable) continue;
        tsc_object_set(dst, src->props[i].key, tsc_object_get(src, src->props[i].key));
    }
    return target;
}

double tsc_value_length(tsc_value_t v) {
    if (!value_is_box(v)) return 0.0;
    if (value_tag(v) == TSC_VALUE_TAG_ARRAY) {
        return (double)((tsc_array_t*)value_ptr(v))->len;
    }
    if (value_tag(v) == TSC_VALUE_TAG_STRING) {
        return (double)((tsc_str_t*)value_ptr(v))->len;
    }
    return 0.0;
}

tsc_array_t* tsc_value_object_keys(tsc_value_t v) {
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        return tsc_object_keys_dyn((tsc_object_t*)value_ptr(v));
    }
    return tsc_array_new(sizeof(tsc_str_t*), 1);
}

tsc_array_t* tsc_value_object_values(tsc_value_t v) {
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        return tsc_object_values_dyn((tsc_object_t*)value_ptr(v));
    }
    return tsc_array_new(sizeof(tsc_value_t), 1);
}

tsc_array_t* tsc_value_object_entries(tsc_value_t v) {
    if (value_is_box(v) && value_tag(v) == TSC_VALUE_TAG_OBJECT) {
        return tsc_object_entries_dyn((tsc_object_t*)value_ptr(v));
    }
    return tsc_array_new(sizeof(tsc_value_t), 1);
}

tsc_value_t tsc_value_object_from_entries(tsc_value_t entries) {
    tsc_object_t* out = tsc_object_new();
    if (!value_is_box(entries) || value_tag(entries) != TSC_VALUE_TAG_ARRAY) {
        return tsc_value_object(out);
    }
    tsc_array_t* outer = (tsc_array_t*)value_ptr(entries);
    for (size_t i = 0; i < outer->len; i++) {
        tsc_value_t pair_value = TSC_ARR(tsc_value_t, outer, i);
        if (!value_is_box(pair_value) || value_tag(pair_value) != TSC_VALUE_TAG_ARRAY) continue;
        tsc_array_t* pair = (tsc_array_t*)value_ptr(pair_value);
        if (pair->len < 2) continue;
        tsc_str_t* key = tsc_value_to_string(TSC_ARR(tsc_value_t, pair, 0));
        tsc_value_t value = TSC_ARR(tsc_value_t, pair, 1);
        tsc_object_set(out, key, value);
    }
    return tsc_value_object(out);
}

tsc_value_t tsc_value_add(tsc_value_t a, tsc_value_t b) {
    bool stringy =
        (value_is_box(a) && value_tag(a) == TSC_VALUE_TAG_STRING) ||
        (value_is_box(b) && value_tag(b) == TSC_VALUE_TAG_STRING);
    if (stringy) {
        return tsc_value_string(tsc_str_concat(tsc_value_to_string(a), tsc_value_to_string(b)));
    }
    return tsc_value_num(tsc_value_as_num(a) + tsc_value_as_num(b));
}

tsc_value_t tsc_value_sub(tsc_value_t a, tsc_value_t b) {
    return tsc_value_num(tsc_value_as_num(a) - tsc_value_as_num(b));
}

tsc_value_t tsc_value_mul(tsc_value_t a, tsc_value_t b) {
    return tsc_value_num(tsc_value_as_num(a) * tsc_value_as_num(b));
}

tsc_value_t tsc_value_div(tsc_value_t a, tsc_value_t b) {
    return tsc_value_num(tsc_value_as_num(a) / tsc_value_as_num(b));
}

tsc_value_t tsc_value_mod(tsc_value_t a, tsc_value_t b) {
    return tsc_value_num(tsc_num_mod(tsc_value_as_num(a), tsc_value_as_num(b)));
}

tsc_value_t tsc_value_pow(tsc_value_t a, tsc_value_t b) {
    return tsc_value_num(pow(tsc_value_as_num(a), tsc_value_as_num(b)));
}

bool tsc_value_eq(tsc_value_t a, tsc_value_t b) {
    if (!value_is_box(a) && !value_is_box(b)) return value_as_num(a) == value_as_num(b);
    if (value_is_box(a) != value_is_box(b)) return false;
    tsc_value_tag_t at = value_tag(a);
    tsc_value_tag_t bt = value_tag(b);
    if (at != bt) return false;
    switch (at) {
        case TSC_VALUE_TAG_UNDEFINED:
        case TSC_VALUE_TAG_NULL:
        case TSC_VALUE_TAG_FALSE:
        case TSC_VALUE_TAG_TRUE:
            return true;
        case TSC_VALUE_TAG_STRING:
            return tsc_str_eq((const tsc_str_t*)value_ptr(a), (const tsc_str_t*)value_ptr(b));
        case TSC_VALUE_TAG_ARRAY:
        case TSC_VALUE_TAG_OBJECT:
            return value_ptr(a) == value_ptr(b);
    }
    return false;
}

bool tsc_value_object_is(tsc_value_t a, tsc_value_t b) {
    if (!value_is_box(a) && !value_is_box(b)) {
        double da = value_as_num(a);
        double db = value_as_num(b);
        if (isnan(da) && isnan(db)) return true;
        if (da == 0.0 && db == 0.0) return signbit(da) == signbit(db);
        return da == db;
    }
    return tsc_value_eq(a, b);
}

int tsc_value_cmp(tsc_value_t a, tsc_value_t b) {
    if (
        value_is_box(a) && value_is_box(b) &&
        value_tag(a) == TSC_VALUE_TAG_STRING &&
        value_tag(b) == TSC_VALUE_TAG_STRING
    ) {
        int c = tsc_str_cmp((const tsc_str_t*)value_ptr(a), (const tsc_str_t*)value_ptr(b));
        return c < 0 ? -1 : c > 0 ? 1 : 0;
    }
    double an = tsc_value_as_num(a);
    double bn = tsc_value_as_num(b);
    if (isnan(an) || isnan(bn)) return 2;
    if (an < bn) return -1;
    if (an > bn) return 1;
    return 0;
}

static double value_slice_arg(tsc_value_t v, double fallback) {
    if (tsc_value_is_nullish(v)) return fallback;
    double n = tsc_value_as_num(v);
    return isnan(n) ? 0.0 : n;
}

static tsc_str_t* value_join_part(tsc_value_t v) {
    return tsc_value_is_nullish(v) ? tsc_str_from_lit("", 0) : tsc_value_to_string(v);
}

tsc_value_t tsc_value_method_char_at(tsc_value_t recv, tsc_value_t index) {
    if (value_is_box(recv) && value_tag(recv) == TSC_VALUE_TAG_STRING) {
        return tsc_value_string(tsc_str_char_at((const tsc_str_t*)value_ptr(recv), tsc_value_as_num(index)));
    }
    return tsc_value_undefined();
}

tsc_value_t tsc_value_method_includes(tsc_value_t recv, tsc_value_t needle) {
    if (value_is_box(recv) && value_tag(recv) == TSC_VALUE_TAG_STRING) {
        return tsc_value_bool(tsc_str_includes((const tsc_str_t*)value_ptr(recv), tsc_value_to_string(needle)));
    }
    if (value_is_box(recv) && value_tag(recv) == TSC_VALUE_TAG_ARRAY) {
        tsc_array_t* a = (tsc_array_t*)value_ptr(recv);
        for (size_t i = 0; i < a->len; i++) {
            if (tsc_value_eq(TSC_ARR(tsc_value_t, a, i), needle)) return tsc_value_bool(true);
        }
    }
    return tsc_value_bool(false);
}

tsc_value_t tsc_value_method_index_of(tsc_value_t recv, tsc_value_t needle) {
    if (value_is_box(recv) && value_tag(recv) == TSC_VALUE_TAG_STRING) {
        return tsc_value_num(tsc_str_index_of((const tsc_str_t*)value_ptr(recv), tsc_value_to_string(needle)));
    }
    if (value_is_box(recv) && value_tag(recv) == TSC_VALUE_TAG_ARRAY) {
        tsc_array_t* a = (tsc_array_t*)value_ptr(recv);
        for (size_t i = 0; i < a->len; i++) {
            if (tsc_value_eq(TSC_ARR(tsc_value_t, a, i), needle)) return tsc_value_num((double)i);
        }
    }
    return tsc_value_num(-1.0);
}

tsc_value_t tsc_value_method_last_index_of(tsc_value_t recv, tsc_value_t needle) {
    if (value_is_box(recv) && value_tag(recv) == TSC_VALUE_TAG_STRING) {
        return tsc_value_num(tsc_str_last_index_of((const tsc_str_t*)value_ptr(recv), tsc_value_to_string(needle)));
    }
    if (value_is_box(recv) && value_tag(recv) == TSC_VALUE_TAG_ARRAY) {
        tsc_array_t* a = (tsc_array_t*)value_ptr(recv);
        size_t i = a->len;
        while (i > 0) {
            i--;
            if (tsc_value_eq(TSC_ARR(tsc_value_t, a, i), needle)) return tsc_value_num((double)i);
        }
    }
    return tsc_value_num(-1.0);
}

tsc_value_t tsc_value_method_at(tsc_value_t recv, tsc_value_t index) {
    if (value_is_box(recv) && value_tag(recv) == TSC_VALUE_TAG_STRING) {
        const tsc_str_t* s = (const tsc_str_t*)value_ptr(recv);
        double n = tsc_value_as_num(index);
        if (isnan(n)) n = 0.0;
        if (n < 0) n = (double)s->len + n;
        if (isinf(n) || n < 0 || n >= (double)s->len) return tsc_value_undefined();
        return tsc_value_string(tsc_str_char_at(s, n));
    }
    if (!value_is_box(recv) || value_tag(recv) != TSC_VALUE_TAG_ARRAY) return tsc_value_undefined();
    tsc_array_t* a = (tsc_array_t*)value_ptr(recv);
    double n = tsc_value_as_num(index);
    if (isnan(n)) n = 0.0;
    if (n < 0) n = (double)a->len + n;
    if (isinf(n) || n < 0 || n >= (double)a->len) return tsc_value_undefined();
    return TSC_ARR(tsc_value_t, a, (size_t)n);
}

tsc_value_t tsc_value_method_locale_compare(tsc_value_t recv, tsc_value_t other) {
    return tsc_value_num(tsc_str_locale_compare(tsc_value_to_string(recv), tsc_value_to_string(other)));
}

tsc_value_t tsc_value_method_join(tsc_value_t recv, tsc_value_t separator) {
    if (!value_is_box(recv) || value_tag(recv) != TSC_VALUE_TAG_ARRAY) return tsc_value_string(tsc_str_from_lit("", 0));
    tsc_array_t* a = (tsc_array_t*)value_ptr(recv);
    tsc_str_t* sep = tsc_value_is_nullish(separator) ? tsc_str_from_lit(",", 1) : tsc_value_to_string(separator);
    tsc_str_t* out = tsc_str_from_lit("", 0);
    for (size_t i = 0; i < a->len; i++) {
        if (i > 0) out = tsc_str_concat(out, sep);
        out = tsc_str_concat(out, value_join_part(TSC_ARR(tsc_value_t, a, i)));
    }
    return tsc_value_string(out);
}

tsc_value_t tsc_value_method_pop(tsc_value_t recv) {
    if (!value_is_box(recv) || value_tag(recv) != TSC_VALUE_TAG_ARRAY) return tsc_value_undefined();
    tsc_array_t* a = (tsc_array_t*)value_ptr(recv);
    if (a->len == 0) return tsc_value_undefined();
    tsc_value_t v = TSC_ARR(tsc_value_t, a, a->len - 1);
    tsc_array_pop_raw(a);
    return v;
}

tsc_value_t tsc_value_method_push(tsc_value_t recv, tsc_value_t value) {
    if (!value_is_box(recv) || value_tag(recv) != TSC_VALUE_TAG_ARRAY) return tsc_value_num(0.0);
    tsc_array_t* a = (tsc_array_t*)value_ptr(recv);
    tsc_array_push_raw(a, &value);
    return tsc_value_num((double)a->len);
}

tsc_value_t tsc_value_method_shift(tsc_value_t recv) {
    if (!value_is_box(recv) || value_tag(recv) != TSC_VALUE_TAG_ARRAY) return tsc_value_undefined();
    tsc_array_t* a = (tsc_array_t*)value_ptr(recv);
    if (a->len == 0) return tsc_value_undefined();
    tsc_value_t v = TSC_ARR(tsc_value_t, a, 0);
    tsc_array_shift_raw(a);
    return v;
}

tsc_value_t tsc_value_method_unshift(tsc_value_t recv, tsc_value_t value) {
    if (!value_is_box(recv) || value_tag(recv) != TSC_VALUE_TAG_ARRAY) return tsc_value_num(0.0);
    tsc_array_t* a = (tsc_array_t*)value_ptr(recv);
    tsc_array_unshift_raw(a, &value);
    return tsc_value_num((double)a->len);
}

tsc_value_t tsc_value_method_concat(tsc_value_t recv, tsc_value_t value) {
    if (value_is_box(recv) && value_tag(recv) == TSC_VALUE_TAG_STRING) {
        return tsc_value_string(tsc_str_concat(
            (const tsc_str_t*)value_ptr(recv),
            tsc_value_to_string(value)
        ));
    }
    if (!value_is_box(recv) || value_tag(recv) != TSC_VALUE_TAG_ARRAY) return tsc_value_undefined();
    tsc_array_t* a = (tsc_array_t*)value_ptr(recv);
    tsc_array_t* out = tsc_array_new(sizeof(tsc_value_t), a->len + 1);
    tsc_array_append(out, a);
    if (value_is_box(value) && value_tag(value) == TSC_VALUE_TAG_ARRAY) {
        tsc_array_append(out, (tsc_array_t*)value_ptr(value));
    } else {
        tsc_array_push_raw(out, &value);
    }
    return tsc_value_array(out);
}

static void value_flat_push(tsc_array_t* out, tsc_value_t value, int depth) {
    if (depth > 0 && value_is_box(value) && value_tag(value) == TSC_VALUE_TAG_ARRAY) {
        tsc_array_t* inner = (tsc_array_t*)value_ptr(value);
        for (size_t i = 0; i < inner->len; i++) {
            value_flat_push(out, TSC_ARR(tsc_value_t, inner, i), depth - 1);
        }
        return;
    }
    tsc_array_push_raw(out, &value);
}

tsc_value_t tsc_value_method_flat(tsc_value_t recv, tsc_value_t depth) {
    if (!value_is_box(recv) || value_tag(recv) != TSC_VALUE_TAG_ARRAY) return tsc_value_undefined();
    double depth_num = tsc_value_is_nullish(depth) ? 1.0 : tsc_value_as_num(depth);
    int depth_i = isnan(depth_num) || depth_num < 0 ? 0 : (int)depth_num;
    tsc_array_t* a = (tsc_array_t*)value_ptr(recv);
    tsc_array_t* out = tsc_array_new(sizeof(tsc_value_t), a->len ? a->len : 1);
    for (size_t i = 0; i < a->len; i++) {
        value_flat_push(out, TSC_ARR(tsc_value_t, a, i), depth_i);
    }
    return tsc_value_array(out);
}

tsc_value_t tsc_value_method_splice(tsc_value_t recv, tsc_value_t start, tsc_value_t delete_count, tsc_array_t* items) {
    if (!value_is_box(recv) || value_tag(recv) != TSC_VALUE_TAG_ARRAY) return tsc_value_undefined();
    tsc_array_t* a = (tsc_array_t*)value_ptr(recv);
    int64_t len = (int64_t)a->len;
    double start_num = value_slice_arg(start, 0.0);
    int64_t at = isnan(start_num) ? 0 : (int64_t)start_num;
    if (at < 0) at = len + at;
    if (at < 0) at = 0;
    if (at > len) at = len;

    double del_num = tsc_value_is_nullish(delete_count)
        ? (double)(len - at)
        : tsc_value_as_num(delete_count);
    int64_t del = isnan(del_num) || del_num < 0 ? 0 : (int64_t)del_num;
    if (del > len - at) del = len - at;

    size_t insert_len = items ? items->len : 0;
    tsc_array_t* removed = tsc_array_new(sizeof(tsc_value_t), del > 0 ? (size_t)del : 1);
    for (int64_t i = 0; i < del; i++) {
        tsc_value_t v = TSC_ARR(tsc_value_t, a, (size_t)(at + i));
        tsc_array_push_raw(removed, &v);
    }

    size_t tail_start = (size_t)(at + del);
    size_t tail_len = a->len - tail_start;
    size_t new_len = a->len - (size_t)del + insert_len;
    tsc_array_reserve(a, new_len > 0 ? new_len : 1);
    if (insert_len != (size_t)del && tail_len > 0) {
        memmove(
            (char*)a->data + ((size_t)at + insert_len) * a->es,
            (char*)a->data + tail_start * a->es,
            tail_len * a->es
        );
    }
    for (size_t i = 0; i < insert_len; i++) {
        TSC_ARR(tsc_value_t, a, (size_t)at + i) = TSC_ARR(tsc_value_t, items, i);
    }
    a->len = new_len;
    return tsc_value_array(removed);
}

tsc_value_t tsc_value_method_sort(tsc_value_t recv) {
    if (!value_is_box(recv) || value_tag(recv) != TSC_VALUE_TAG_ARRAY) return recv;
    tsc_array_t* a = (tsc_array_t*)value_ptr(recv);
    for (size_t i = 1; i < a->len; i++) {
        tsc_value_t key = TSC_ARR(tsc_value_t, a, i);
        size_t j = i;
        while (j > 0) {
            tsc_value_t prev = TSC_ARR(tsc_value_t, a, j - 1);
            if (tsc_str_cmp(tsc_value_to_string(prev), tsc_value_to_string(key)) <= 0) break;
            TSC_ARR(tsc_value_t, a, j) = prev;
            j--;
        }
        TSC_ARR(tsc_value_t, a, j) = key;
    }
    return recv;
}

tsc_value_t tsc_value_method_to_sorted(tsc_value_t recv) {
    if (!value_is_box(recv) || value_tag(recv) != TSC_VALUE_TAG_ARRAY) return recv;
    tsc_array_t* a = (tsc_array_t*)value_ptr(recv);
    tsc_value_t copy = tsc_value_array(tsc_array_slice(a, 0.0, (double)a->len));
    return tsc_value_method_sort(copy);
}

tsc_value_t tsc_value_method_with(tsc_value_t recv, tsc_value_t index, tsc_value_t value) {
    if (!value_is_box(recv) || value_tag(recv) != TSC_VALUE_TAG_ARRAY) return tsc_value_undefined();
    tsc_array_t* a = (tsc_array_t*)value_ptr(recv);
    return tsc_value_array(tsc_array_with(a, tsc_value_as_num(index), &value));
}

tsc_value_t tsc_value_method_to_spliced(tsc_value_t recv, tsc_value_t start, tsc_value_t delete_count, int argc, tsc_array_t* items) {
    if (!value_is_box(recv) || value_tag(recv) != TSC_VALUE_TAG_ARRAY) return tsc_value_undefined();
    tsc_array_t* a = (tsc_array_t*)value_ptr(recv);
    return tsc_value_array(tsc_array_to_spliced(a, tsc_value_as_num(start), tsc_value_as_num(delete_count), argc, items));
}

void tsc_value_array_push_flat(tsc_array_t* out, tsc_value_t value) {
    if (value_is_box(value) && value_tag(value) == TSC_VALUE_TAG_ARRAY) {
        tsc_array_append(out, (tsc_array_t*)value_ptr(value));
        return;
    }
    tsc_array_push_raw(out, &value);
}

tsc_value_t tsc_value_method_fill(tsc_value_t recv, tsc_value_t value, tsc_value_t start, tsc_value_t end) {
    if (!value_is_box(recv) || value_tag(recv) != TSC_VALUE_TAG_ARRAY) return recv;
    tsc_array_t* a = (tsc_array_t*)value_ptr(recv);
    double len = (double)a->len;
    double s = value_slice_arg(start, 0.0);
    double e = value_slice_arg(end, len);
    tsc_array_fill(a, &value, s, e);
    return recv;
}

tsc_value_t tsc_value_method_copy_within(tsc_value_t recv, tsc_value_t target, tsc_value_t start, tsc_value_t end) {
    if (!value_is_box(recv) || value_tag(recv) != TSC_VALUE_TAG_ARRAY) return recv;
    tsc_array_t* a = (tsc_array_t*)value_ptr(recv);
    double len = (double)a->len;
    double t = value_slice_arg(target, 0.0);
    double s = value_slice_arg(start, 0.0);
    double e = value_slice_arg(end, len);
    tsc_array_copy_within(a, t, s, e);
    return recv;
}

tsc_value_t tsc_value_method_reverse(tsc_value_t recv) {
    if (value_is_box(recv) && value_tag(recv) == TSC_VALUE_TAG_ARRAY) {
        tsc_array_reverse((tsc_array_t*)value_ptr(recv));
    }
    return recv;
}

tsc_value_t tsc_value_method_to_reversed(tsc_value_t recv) {
    if (value_is_box(recv) && value_tag(recv) == TSC_VALUE_TAG_ARRAY) {
        return tsc_value_array(tsc_array_to_reversed((const tsc_array_t*)value_ptr(recv)));
    }
    return tsc_value_undefined();
}

tsc_value_t tsc_value_method_slice(tsc_value_t recv, tsc_value_t start, tsc_value_t end) {
    double len = tsc_value_length(recv);
    double s = value_slice_arg(start, 0.0);
    double e = value_slice_arg(end, len);
    if (value_is_box(recv) && value_tag(recv) == TSC_VALUE_TAG_STRING) {
        return tsc_value_string(tsc_str_slice((const tsc_str_t*)value_ptr(recv), s, e));
    }
    if (value_is_box(recv) && value_tag(recv) == TSC_VALUE_TAG_ARRAY) {
        return tsc_value_array(tsc_array_slice((const tsc_array_t*)value_ptr(recv), s, e));
    }
    return tsc_value_undefined();
}

tsc_value_t tsc_value_method_substring(tsc_value_t recv, tsc_value_t start, tsc_value_t end) {
    if (value_is_box(recv) && value_tag(recv) == TSC_VALUE_TAG_STRING) {
        const tsc_str_t* str = (const tsc_str_t*)value_ptr(recv);
        double s = value_slice_arg(start, 0.0);
        double e = value_slice_arg(end, (double)str->len);
        return tsc_value_string(tsc_str_substring(str, s, e));
    }
    return tsc_value_undefined();
}

tsc_value_t tsc_value_method_replace(tsc_value_t recv, tsc_value_t search, tsc_value_t replacement) {
    if (!value_is_box(recv) || value_tag(recv) != TSC_VALUE_TAG_STRING) return tsc_value_undefined();
    return tsc_value_string(tsc_str_replace(
        (const tsc_str_t*)value_ptr(recv),
        tsc_value_to_string(search),
        tsc_value_to_string(replacement)
    ));
}

tsc_value_t tsc_value_method_replace_all(tsc_value_t recv, tsc_value_t search, tsc_value_t replacement) {
    if (!value_is_box(recv) || value_tag(recv) != TSC_VALUE_TAG_STRING) return tsc_value_undefined();
    return tsc_value_string(tsc_str_replace_all(
        (const tsc_str_t*)value_ptr(recv),
        tsc_value_to_string(search),
        tsc_value_to_string(replacement)
    ));
}

tsc_value_t tsc_value_method_split(tsc_value_t recv, tsc_value_t separator) {
    if (!value_is_box(recv) || value_tag(recv) != TSC_VALUE_TAG_STRING) return tsc_value_undefined();
    tsc_array_t* parts = tsc_str_split((const tsc_str_t*)value_ptr(recv), tsc_value_to_string(separator));
    tsc_array_t* out = tsc_array_new(sizeof(tsc_value_t), parts->len ? parts->len : 1);
    for (size_t i = 0; i < parts->len; i++) {
        tsc_value_t part = tsc_value_string(TSC_ARR(tsc_str_t*, parts, i));
        tsc_array_push_raw(out, &part);
    }
    return tsc_value_array(out);
}

tsc_value_t tsc_value_method_starts_with(tsc_value_t recv, tsc_value_t needle) {
    if (value_is_box(recv) && value_tag(recv) == TSC_VALUE_TAG_STRING) {
        return tsc_value_bool(tsc_str_starts_with((const tsc_str_t*)value_ptr(recv), tsc_value_to_string(needle)));
    }
    return tsc_value_bool(false);
}

tsc_value_t tsc_value_method_ends_with(tsc_value_t recv, tsc_value_t needle) {
    if (value_is_box(recv) && value_tag(recv) == TSC_VALUE_TAG_STRING) {
        return tsc_value_bool(tsc_str_ends_with((const tsc_str_t*)value_ptr(recv), tsc_value_to_string(needle)));
    }
    return tsc_value_bool(false);
}

tsc_value_t tsc_value_method_to_lower(tsc_value_t recv) {
    if (value_is_box(recv) && value_tag(recv) == TSC_VALUE_TAG_STRING) {
        return tsc_value_string(tsc_str_to_lower((const tsc_str_t*)value_ptr(recv)));
    }
    return tsc_value_to_string(recv) ? tsc_value_string(tsc_value_to_string(recv)) : tsc_value_undefined();
}

tsc_value_t tsc_value_method_to_upper(tsc_value_t recv) {
    if (value_is_box(recv) && value_tag(recv) == TSC_VALUE_TAG_STRING) {
        return tsc_value_string(tsc_str_to_upper((const tsc_str_t*)value_ptr(recv)));
    }
    return tsc_value_to_string(recv) ? tsc_value_string(tsc_value_to_string(recv)) : tsc_value_undefined();
}

tsc_value_t tsc_value_method_normalize(tsc_value_t recv, tsc_value_t form) {
    if (value_is_box(recv) && value_tag(recv) == TSC_VALUE_TAG_STRING) {
        tsc_str_t* f = tsc_value_is_nullish(form) ? tsc_str_from_lit("NFC", 3) : tsc_value_to_string(form);
        return tsc_value_string(tsc_str_normalize((const tsc_str_t*)value_ptr(recv), f));
    }
    return tsc_value_undefined();
}

tsc_value_t tsc_value_method_trim(tsc_value_t recv) {
    if (value_is_box(recv) && value_tag(recv) == TSC_VALUE_TAG_STRING) {
        return tsc_value_string(tsc_str_trim((const tsc_str_t*)value_ptr(recv)));
    }
    return tsc_value_undefined();
}

tsc_value_t tsc_value_method_trim_start(tsc_value_t recv) {
    if (value_is_box(recv) && value_tag(recv) == TSC_VALUE_TAG_STRING) {
        return tsc_value_string(tsc_str_trim_start((const tsc_str_t*)value_ptr(recv)));
    }
    return tsc_value_undefined();
}

tsc_value_t tsc_value_method_trim_end(tsc_value_t recv) {
    if (value_is_box(recv) && value_tag(recv) == TSC_VALUE_TAG_STRING) {
        return tsc_value_string(tsc_str_trim_end((const tsc_str_t*)value_ptr(recv)));
    }
    return tsc_value_undefined();
}

tsc_value_t tsc_value_method_repeat(tsc_value_t recv, tsc_value_t count) {
    if (value_is_box(recv) && value_tag(recv) == TSC_VALUE_TAG_STRING) {
        return tsc_value_string(tsc_str_repeat((const tsc_str_t*)value_ptr(recv), tsc_value_as_num(count)));
    }
    return tsc_value_undefined();
}

tsc_value_t tsc_value_method_pad_start(tsc_value_t recv, tsc_value_t target, tsc_value_t pad) {
    if (value_is_box(recv) && value_tag(recv) == TSC_VALUE_TAG_STRING) {
        tsc_str_t* fill = tsc_value_is_nullish(pad) ? tsc_str_from_lit(" ", 1) : tsc_value_to_string(pad);
        return tsc_value_string(tsc_str_pad_start((const tsc_str_t*)value_ptr(recv), tsc_value_as_num(target), fill));
    }
    return tsc_value_undefined();
}

tsc_value_t tsc_value_method_pad_end(tsc_value_t recv, tsc_value_t target, tsc_value_t pad) {
    if (value_is_box(recv) && value_tag(recv) == TSC_VALUE_TAG_STRING) {
        tsc_str_t* fill = tsc_value_is_nullish(pad) ? tsc_str_from_lit(" ", 1) : tsc_value_to_string(pad);
        return tsc_value_string(tsc_str_pad_end((const tsc_str_t*)value_ptr(recv), tsc_value_as_num(target), fill));
    }
    return tsc_value_undefined();
}

tsc_object_t* tsc_object_new(void) {
    tsc_object_t* o = (tsc_object_t*)TSC_GC_MALLOC(sizeof(tsc_object_t));
    o->len = 0;
    o->cap = 4;
    o->extensible = true;
    o->prototype = tsc_value_null();
    o->props = (tsc_object_prop_t*)TSC_GC_MALLOC(sizeof(tsc_object_prop_t) * o->cap);
    return o;
}

static void object_reserve(tsc_object_t* o, size_t cap) {
    if (cap <= o->cap) return;
    size_t next = o->cap ? o->cap : 4;
    while (next < cap) next *= 2;
    tsc_object_prop_t* props = (tsc_object_prop_t*)TSC_GC_MALLOC(sizeof(tsc_object_prop_t) * next);
    if (o->props && o->len > 0) memcpy(props, o->props, sizeof(tsc_object_prop_t) * o->len);
    o->props = props;
    o->cap = next;
}

static ssize_t object_find(const tsc_object_t* o, const tsc_str_t* key) {
    if (!o) return -1;
    for (size_t i = 0; i < o->len; i++) {
        if (tsc_str_eq(o->props[i].key, key)) return (ssize_t)i;
    }
    return -1;
}

static const tsc_object_t* object_prototype_object(const tsc_object_t* o) {
    if (!o || !value_is_object_value(o->prototype)) return NULL;
    return (const tsc_object_t*)value_ptr(o->prototype);
}

static const tsc_object_prop_t* object_find_chain_prop(const tsc_object_t* o, const tsc_str_t* key) {
    const tsc_object_t* cur = o;
    while (cur) {
        ssize_t found = object_find(cur, key);
        if (found >= 0) return &cur->props[(size_t)found];
        cur = object_prototype_object(cur);
    }
    return NULL;
}

static bool object_chain_contains(tsc_value_t prototype, const tsc_object_t* needle) {
    while (value_is_object_value(prototype)) {
        const tsc_object_t* cur = (const tsc_object_t*)value_ptr(prototype);
        if (cur == needle) return true;
        prototype = cur->prototype;
    }
    return false;
}

bool tsc_object_is_prototype_of(const tsc_object_t* prototype, const tsc_object_t* object) {
    if (!prototype || !object) return false;
    return object_chain_contains(object->prototype, prototype);
}

bool tsc_object_set(tsc_object_t* o, tsc_str_t* key, tsc_value_t value) {
    ssize_t found = object_find(o, key);
    if (found >= 0) {
        tsc_object_prop_t* prop = &o->props[(size_t)found];
        if (prop->accessor) return prop->setter ? prop->setter(value) : false;
        if (!prop->writable) return false;
        prop->value = value;
        return true;
    }
    const tsc_object_prop_t* inherited = object_find_chain_prop(object_prototype_object(o), key);
    if (inherited) {
        if (inherited->accessor) return inherited->setter ? inherited->setter(value) : false;
        if (!inherited->writable) return false;
    }
    if (!o->extensible) return false;
    object_reserve(o, o->len + 1);
    o->props[o->len].key = key;
    o->props[o->len].value = value;
    o->props[o->len].accessor = false;
    o->props[o->len].getter = NULL;
    o->props[o->len].setter = NULL;
    o->props[o->len].writable = true;
    o->props[o->len].enumerable = true;
    o->props[o->len].configurable = true;
    o->len++;
    return true;
}

bool tsc_object_define(tsc_object_t* o, tsc_str_t* key, tsc_value_t value, bool writable, bool enumerable, bool configurable) {
    ssize_t found = object_find(o, key);
    if (found >= 0) {
        tsc_object_prop_t* prop = &o->props[(size_t)found];
        if (!prop->configurable) return false;
        prop->value = value;
        prop->accessor = false;
        prop->getter = NULL;
        prop->setter = NULL;
        prop->writable = writable;
        prop->enumerable = enumerable;
        prop->configurable = configurable;
        return true;
    }
    if (!o->extensible) return false;
    object_reserve(o, o->len + 1);
    o->props[o->len].key = key;
    o->props[o->len].value = value;
    o->props[o->len].accessor = false;
    o->props[o->len].getter = NULL;
    o->props[o->len].setter = NULL;
    o->props[o->len].writable = writable;
    o->props[o->len].enumerable = enumerable;
    o->props[o->len].configurable = configurable;
    o->len++;
    return true;
}

bool tsc_object_define_accessor(tsc_object_t* o, tsc_str_t* key, tsc_accessor_getter_t getter, tsc_accessor_setter_t setter, bool enumerable, bool configurable) {
    ssize_t found = object_find(o, key);
    if (found >= 0) {
        tsc_object_prop_t* prop = &o->props[(size_t)found];
        if (!prop->configurable) return false;
        prop->value = tsc_value_undefined();
        prop->accessor = true;
        prop->getter = getter;
        prop->setter = setter;
        prop->writable = false;
        prop->enumerable = enumerable;
        prop->configurable = configurable;
        return true;
    }
    if (!o->extensible) return false;
    object_reserve(o, o->len + 1);
    o->props[o->len].key = key;
    o->props[o->len].value = tsc_value_undefined();
    o->props[o->len].accessor = true;
    o->props[o->len].getter = getter;
    o->props[o->len].setter = setter;
    o->props[o->len].writable = false;
    o->props[o->len].enumerable = enumerable;
    o->props[o->len].configurable = configurable;
    o->len++;
    return true;
}

tsc_value_t tsc_object_get_prototype_of(const tsc_object_t* o) {
    return o ? o->prototype : tsc_value_undefined();
}

bool tsc_object_set_prototype_of(tsc_object_t* o, tsc_value_t prototype) {
    if (!o || !value_is_valid_prototype(prototype)) return false;
    if (o->prototype == prototype) return true;
    if (!o->extensible) return false;
    if (object_chain_contains(prototype, o)) return false;
    o->prototype = prototype;
    return true;
}

tsc_value_t tsc_object_get(const tsc_object_t* o, const tsc_str_t* key) {
    const tsc_object_prop_t* prop = object_find_chain_prop(o, key);
    if (prop) {
        if (prop->accessor) return prop->getter ? prop->getter() : tsc_value_undefined();
        return prop->value;
    }
    return tsc_value_undefined();
}

bool tsc_object_has_own(const tsc_object_t* o, const tsc_str_t* key) {
    return object_find(o, key) >= 0;
}

bool tsc_object_property_is_enumerable(const tsc_object_t* o, const tsc_str_t* key) {
    ssize_t found = object_find(o, key);
    return found >= 0 && o->props[(size_t)found].enumerable;
}

bool tsc_object_has(const tsc_object_t* o, const tsc_str_t* key) {
    return object_find_chain_prop(o, key) != NULL;
}

bool tsc_object_delete(tsc_object_t* o, const tsc_str_t* key) {
    ssize_t found = object_find(o, key);
    if (found < 0) return true;
    size_t idx = (size_t)found;
    if (!o->props[idx].configurable) return false;
    for (size_t i = idx + 1; i < o->len; i++) {
        o->props[i - 1] = o->props[i];
    }
    o->len--;
    return true;
}

bool tsc_object_is_extensible(const tsc_object_t* o) {
    return o && o->extensible;
}

bool tsc_object_prevent_extensions(tsc_object_t* o) {
    if (!o) return false;
    o->extensible = false;
    return true;
}

bool tsc_object_seal(tsc_object_t* o) {
    if (!o) return false;
    o->extensible = false;
    for (size_t i = 0; i < o->len; i++) {
        o->props[i].configurable = false;
    }
    return true;
}

bool tsc_object_freeze(tsc_object_t* o) {
    if (!tsc_object_seal(o)) return false;
    for (size_t i = 0; i < o->len; i++) {
        o->props[i].writable = false;
    }
    return true;
}

bool tsc_object_is_sealed(const tsc_object_t* o) {
    if (!o || o->extensible) return false;
    for (size_t i = 0; i < o->len; i++) {
        if (o->props[i].configurable) return false;
    }
    return true;
}

bool tsc_object_is_frozen(const tsc_object_t* o) {
    if (!tsc_object_is_sealed(o)) return false;
    for (size_t i = 0; i < o->len; i++) {
        if (!o->props[i].accessor && o->props[i].writable) return false;
    }
    return true;
}

tsc_array_t* tsc_object_keys_dyn(const tsc_object_t* o) {
    tsc_array_t* a = tsc_array_new(sizeof(tsc_str_t*), o ? o->len : 1);
    if (!o) return a;
    for (size_t i = 0; i < o->len; i++) {
        if (!o->props[i].enumerable) continue;
        tsc_str_t* key = o->props[i].key;
        tsc_array_push_raw(a, &key);
    }
    return a;
}

tsc_array_t* tsc_object_own_keys_dyn(const tsc_object_t* o) {
    tsc_array_t* a = tsc_array_new(sizeof(tsc_str_t*), o ? o->len : 1);
    if (!o) return a;
    for (size_t i = 0; i < o->len; i++) {
        tsc_str_t* key = o->props[i].key;
        tsc_array_push_raw(a, &key);
    }
    return a;
}

tsc_array_t* tsc_object_values_dyn(const tsc_object_t* o) {
    tsc_array_t* a = tsc_array_new(sizeof(tsc_value_t), o ? o->len : 1);
    if (!o) return a;
    for (size_t i = 0; i < o->len; i++) {
        if (!o->props[i].enumerable) continue;
        tsc_value_t v = tsc_object_get(o, o->props[i].key);
        tsc_array_push_raw(a, &v);
    }
    return a;
}

tsc_array_t* tsc_object_entries_dyn(const tsc_object_t* o) {
    tsc_array_t* a = tsc_array_new(sizeof(tsc_value_t), o ? o->len : 1);
    if (!o) return a;
    for (size_t i = 0; i < o->len; i++) {
        if (!o->props[i].enumerable) continue;
        tsc_array_t* pair = tsc_array_new(sizeof(tsc_value_t), 2);
        tsc_value_t key = tsc_value_string(o->props[i].key);
        tsc_value_t value = tsc_object_get(o, o->props[i].key);
        tsc_array_push_raw(pair, &key);
        tsc_array_push_raw(pair, &value);
        tsc_value_t boxed = tsc_value_array(pair);
        tsc_array_push_raw(a, &boxed);
    }
    return a;
}

tsc_str_t* tsc_value_json_stringify(tsc_value_t v) {
    if (!value_is_box(v)) return tsc_json_num(value_as_num(v));
    switch (value_tag(v)) {
        case TSC_VALUE_TAG_UNDEFINED:
        case TSC_VALUE_TAG_NULL:
            return tsc_str_from_lit("null", 4);
        case TSC_VALUE_TAG_FALSE:
            return tsc_str_from_lit("false", 5);
        case TSC_VALUE_TAG_TRUE:
            return tsc_str_from_lit("true", 4);
        case TSC_VALUE_TAG_STRING:
            return tsc_json_escape_string((tsc_str_t*)value_ptr(v));
        case TSC_VALUE_TAG_ARRAY: {
            tsc_array_t* a = (tsc_array_t*)value_ptr(v);
            tsc_str_t* out = tsc_str_from_lit("[", 1);
            for (size_t i = 0; i < a->len; i++) {
                if (i > 0) out = tsc_str_concat(out, tsc_str_from_lit(",", 1));
                out = tsc_str_concat(out, tsc_value_json_stringify(TSC_ARR(tsc_value_t, a, i)));
            }
            return tsc_str_concat(out, tsc_str_from_lit("]", 1));
        }
        case TSC_VALUE_TAG_OBJECT: {
            tsc_object_t* o = (tsc_object_t*)value_ptr(v);
            tsc_str_t* out = tsc_str_from_lit("{", 1);
            bool first = true;
            for (size_t i = 0; i < o->len; i++) {
                if (!o->props[i].enumerable) continue;
                if (!first) out = tsc_str_concat(out, tsc_str_from_lit(",", 1));
                first = false;
                out = tsc_str_concat(out, tsc_json_escape_string(o->props[i].key));
                out = tsc_str_concat(out, tsc_str_from_lit(":", 1));
                out = tsc_str_concat(out, tsc_value_json_stringify(tsc_object_get(o, o->props[i].key)));
            }
            return tsc_str_concat(out, tsc_str_from_lit("}", 1));
        }
    }
    return tsc_str_from_lit("null", 4);
}

typedef struct json_parser {
    const char* s;
    size_t len;
    size_t pos;
} json_parser_t;

static void jp_ws(json_parser_t* p) {
    while (p->pos < p->len && isspace((unsigned char)p->s[p->pos])) p->pos++;
}

static bool jp_lit(json_parser_t* p, const char* lit) {
    size_t n = strlen(lit);
    if (p->pos + n <= p->len && memcmp(p->s + p->pos, lit, n) == 0) {
        p->pos += n;
        return true;
    }
    return false;
}

static tsc_value_t jp_value(json_parser_t* p);

static tsc_str_t* jp_string(json_parser_t* p) {
    if (p->pos >= p->len || p->s[p->pos] != '"') tsc_panic("JSON.parse expected string");
    p->pos++;
    char* buf = (char*)TSC_GC_MALLOC_ATOMIC(p->len - p->pos + 1);
    size_t out = 0;
    while (p->pos < p->len) {
        unsigned char c = (unsigned char)p->s[p->pos++];
        if (c == '"') {
            tsc_str_t* s = str_alloc(out);
            memcpy((char*)s->data, buf, out);
            return s;
        }
        if (c == '\\') {
            if (p->pos >= p->len) tsc_panic("JSON.parse bad escape");
            c = (unsigned char)p->s[p->pos++];
            switch (c) {
                case '"': buf[out++] = '"'; break;
                case '\\': buf[out++] = '\\'; break;
                case '/': buf[out++] = '/'; break;
                case 'b': buf[out++] = '\b'; break;
                case 'f': buf[out++] = '\f'; break;
                case 'n': buf[out++] = '\n'; break;
                case 'r': buf[out++] = '\r'; break;
                case 't': buf[out++] = '\t'; break;
                default: tsc_panic("JSON.parse unsupported escape");
            }
        } else {
            buf[out++] = (char)c;
        }
    }
    tsc_panic("JSON.parse unterminated string");
    return tsc_str_from_lit("", 0);
}

static tsc_value_t jp_array(json_parser_t* p) {
    p->pos++;
    tsc_array_t* a = tsc_array_new(sizeof(tsc_value_t), 4);
    jp_ws(p);
    if (p->pos < p->len && p->s[p->pos] == ']') {
        p->pos++;
        return tsc_value_array(a);
    }
    while (p->pos < p->len) {
        tsc_value_t v = jp_value(p);
        tsc_array_push_raw(a, &v);
        jp_ws(p);
        if (p->pos < p->len && p->s[p->pos] == ',') {
            p->pos++;
            continue;
        }
        if (p->pos < p->len && p->s[p->pos] == ']') {
            p->pos++;
            return tsc_value_array(a);
        }
        tsc_panic("JSON.parse expected array separator");
    }
    tsc_panic("JSON.parse unterminated array");
    return tsc_value_array(a);
}

static tsc_value_t jp_object(json_parser_t* p) {
    p->pos++;
    tsc_object_t* o = tsc_object_new();
    jp_ws(p);
    if (p->pos < p->len && p->s[p->pos] == '}') {
        p->pos++;
        return tsc_value_object(o);
    }
    while (p->pos < p->len) {
        jp_ws(p);
        tsc_str_t* key = jp_string(p);
        jp_ws(p);
        if (p->pos >= p->len || p->s[p->pos] != ':') tsc_panic("JSON.parse expected ':'");
        p->pos++;
        tsc_value_t value = jp_value(p);
        tsc_object_set(o, key, value);
        jp_ws(p);
        if (p->pos < p->len && p->s[p->pos] == ',') {
            p->pos++;
            continue;
        }
        if (p->pos < p->len && p->s[p->pos] == '}') {
            p->pos++;
            return tsc_value_object(o);
        }
        tsc_panic("JSON.parse expected object separator");
    }
    tsc_panic("JSON.parse unterminated object");
    return tsc_value_object(o);
}

static tsc_value_t jp_number(json_parser_t* p) {
    const char* start = p->s + p->pos;
    char* end = NULL;
    double n = strtod(start, &end);
    if (end == start) tsc_panic("JSON.parse expected number");
    p->pos += (size_t)(end - start);
    return tsc_value_num(n);
}

static tsc_value_t jp_value(json_parser_t* p) {
    jp_ws(p);
    if (p->pos >= p->len) tsc_panic("JSON.parse unexpected end");
    char c = p->s[p->pos];
    if (c == '"') return tsc_value_string(jp_string(p));
    if (c == '[') return jp_array(p);
    if (c == '{') return jp_object(p);
    if (jp_lit(p, "true")) return tsc_value_bool(true);
    if (jp_lit(p, "false")) return tsc_value_bool(false);
    if (jp_lit(p, "null")) return tsc_value_null();
    return jp_number(p);
}

tsc_value_t tsc_json_parse(tsc_str_t* text) {
    json_parser_t p = { text->data, text->len, 0 };
    tsc_value_t v = jp_value(&p);
    jp_ws(&p);
    if (p.pos != p.len) tsc_panic("JSON.parse trailing input");
    return v;
}

/* ---------------- Map / Set (type-erased linear scan) ---------------- */

static bool key_eq(tsc_key_kind_t kk, size_t ks, const void* a, const void* b) {
    switch (kk) {
        case TSC_KEY_NUM: {
            double x, y; memcpy(&x, a, sizeof x); memcpy(&y, b, sizeof y);
            return x == y;
        }
        case TSC_KEY_STR: {
            tsc_str_t *x, *y; memcpy(&x, a, sizeof x); memcpy(&y, b, sizeof y);
            return tsc_str_eq(x, y);
        }
        case TSC_KEY_PTR: {
            void *x, *y; memcpy(&x, a, sizeof x); memcpy(&y, b, sizeof y);
            return x == y;
        }
        case TSC_KEY_BOOL: {
            bool x, y; memcpy(&x, a, sizeof x); memcpy(&y, b, sizeof y);
            return x == y;
        }
    }
    (void)ks;
    return memcmp(a, b, ks) == 0;
}

static size_t map_find(const tsc_map_t* m, const void* k) {
    for (size_t i = 0; i < m->len; i++) {
        if (key_eq(m->kk, m->ks, (char*)m->keys + i * m->ks, k)) return i;
    }
    return (size_t)-1;
}

static void map_grow(tsc_map_t* m, size_t want) {
    if (want <= m->cap) return;
    size_t cap = m->cap ? m->cap : 4;
    while (cap < want) cap *= 2;
    void* nk = TSC_GC_MALLOC(cap * m->ks);
    void* nv = TSC_GC_MALLOC(cap * m->vs);
    if (m->len > 0) {
        memcpy(nk, m->keys, m->len * m->ks);
        memcpy(nv, m->values, m->len * m->vs);
    }
    m->keys = nk; m->values = nv; m->cap = cap;
}

tsc_map_t* tsc_map_new(size_t ks, size_t vs, int kk, size_t initial_cap) {
    tsc_map_t* m = (tsc_map_t*)TSC_GC_MALLOC(sizeof(tsc_map_t));
    m->ks = ks; m->vs = vs; m->kk = (tsc_key_kind_t)kk;
    m->len = 0; m->cap = 0; m->keys = NULL; m->values = NULL;
    if (initial_cap > 0) map_grow(m, initial_cap);
    return m;
}

void tsc_map_set_raw(tsc_map_t* m, const void* k, const void* v) {
    size_t idx = map_find(m, k);
    if (idx != (size_t)-1) {
        memcpy((char*)m->values + idx * m->vs, v, m->vs);
        return;
    }
    map_grow(m, m->len + 1);
    memcpy((char*)m->keys + m->len * m->ks, k, m->ks);
    memcpy((char*)m->values + m->len * m->vs, v, m->vs);
    m->len++;
}

bool tsc_map_get_raw(const tsc_map_t* m, const void* k, void* out) {
    size_t idx = map_find(m, k);
    if (idx == (size_t)-1) return false;
    memcpy(out, (char*)m->values + idx * m->vs, m->vs);
    return true;
}

bool tsc_map_has_raw(const tsc_map_t* m, const void* k) {
    return map_find(m, k) != (size_t)-1;
}

bool tsc_map_delete_raw(tsc_map_t* m, const void* k) {
    size_t idx = map_find(m, k);
    if (idx == (size_t)-1) return false;
    size_t tail = m->len - idx - 1;
    if (tail > 0) {
        memmove((char*)m->keys + idx * m->ks, (char*)m->keys + (idx + 1) * m->ks, tail * m->ks);
        memmove((char*)m->values + idx * m->vs, (char*)m->values + (idx + 1) * m->vs, tail * m->vs);
    }
    m->len--;
    return true;
}

void tsc_map_clear(tsc_map_t* m) { m->len = 0; }
double tsc_map_size(const tsc_map_t* m) { return (double)m->len; }

tsc_array_t* tsc_map_keys(const tsc_map_t* m) {
    tsc_array_t* a = tsc_array_new(m->ks, m->len ? m->len : 1);
    if (m->len) memcpy(a->data, m->keys, m->len * m->ks);
    a->len = m->len;
    return a;
}

tsc_array_t* tsc_map_values(const tsc_map_t* m) {
    tsc_array_t* a = tsc_array_new(m->vs, m->len ? m->len : 1);
    if (m->len) memcpy(a->data, m->values, m->len * m->vs);
    a->len = m->len;
    return a;
}

/* Set ------------ */

static size_t set_find(const tsc_set_t* s, const void* v) {
    for (size_t i = 0; i < s->len; i++) {
        if (key_eq(s->kk, s->es, (char*)s->data + i * s->es, v)) return i;
    }
    return (size_t)-1;
}

static void set_grow(tsc_set_t* s, size_t want) {
    if (want <= s->cap) return;
    size_t cap = s->cap ? s->cap : 4;
    while (cap < want) cap *= 2;
    void* nd = TSC_GC_MALLOC(cap * s->es);
    if (s->len > 0) memcpy(nd, s->data, s->len * s->es);
    s->data = nd; s->cap = cap;
}

tsc_set_t* tsc_set_new(size_t es, int kk, size_t initial_cap) {
    tsc_set_t* s = (tsc_set_t*)TSC_GC_MALLOC(sizeof(tsc_set_t));
    s->es = es; s->kk = (tsc_key_kind_t)kk;
    s->len = 0; s->cap = 0; s->data = NULL;
    if (initial_cap > 0) set_grow(s, initial_cap);
    return s;
}

void tsc_set_add_raw(tsc_set_t* s, const void* v) {
    if (set_find(s, v) != (size_t)-1) return;
    set_grow(s, s->len + 1);
    memcpy((char*)s->data + s->len * s->es, v, s->es);
    s->len++;
}

bool tsc_set_has_raw(const tsc_set_t* s, const void* v) {
    return set_find(s, v) != (size_t)-1;
}

bool tsc_set_delete_raw(tsc_set_t* s, const void* v) {
    size_t idx = set_find(s, v);
    if (idx == (size_t)-1) return false;
    size_t tail = s->len - idx - 1;
    if (tail > 0) {
        memmove((char*)s->data + idx * s->es, (char*)s->data + (idx + 1) * s->es, tail * s->es);
    }
    s->len--;
    return true;
}

void tsc_set_clear(tsc_set_t* s) { s->len = 0; }
double tsc_set_size(const tsc_set_t* s) { return (double)s->len; }

tsc_array_t* tsc_set_values(const tsc_set_t* s) {
    tsc_array_t* a = tsc_array_new(s->es, s->len ? s->len : 1);
    if (s->len) memcpy(a->data, s->data, s->len * s->es);
    a->len = s->len;
    return a;
}

/* ---------------- console ---------------- */

static void console_write_str(FILE* f, const tsc_str_t* s) {
    if (s && s->len > 0) fwrite(s->data, 1, s->len, f);
}

static void console_write(FILE* f, size_t n, va_list ap) {
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

bool tsc_instanceof(const char* type_chain, const char* class_name) {
    if (!type_chain || !class_name) return false;
    size_t n = strlen(class_name);
    for (const char* p = type_chain; (p = strstr(p, class_name)) != NULL; p += n) {
        if ((p == type_chain || p[-1] == '|') && p[n] == '|') return true;
    }
    return false;
}

/* ---------------- fs (sync) ---------------- */

static char* cstr_dup(const tsc_str_t* s) {
    char* c = (char*)malloc(s->len + 1);
    memcpy(c, s->data, s->len);
    c[s->len] = '\0';
    return c;
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

void tsc_fs_write_file_sync(const tsc_str_t* path, const tsc_str_t* data) {
    char* p = cstr_dup(path);
    FILE* f = fopen(p, "wb");
    free(p);
    if (!f) { tsc_throw_str(tsc_str_from_cstr("fs.writeFileSync: could not open")); return; }
    fwrite(data->data, 1, data->len, f);
    fclose(f);
}

bool tsc_fs_exists_sync(const tsc_str_t* path) {
    char* p = cstr_dup(path);
    struct stat st;
    int r = stat(p, &st);
    free(p);
    return r == 0;
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

/* ---------------- path ---------------- */

static tsc_str_t* path_join_impl(size_t n, va_list ap, bool resolve) {
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

double tsc_date_now(void) {
    struct timespec ts;
    if (clock_gettime(CLOCK_REALTIME, &ts) == 0) {
        return (double)ts.tv_sec * 1000.0 + (double)ts.tv_nsec / 1e6;
    }
    return 0.0;
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

/* ---------------- exceptions ---------------- */

void tsc_try_push(tsc_try_frame_t* f) {
    f->prev = g_try_top;
    g_try_top = f;
}

void tsc_try_pop(void) {
    if (g_try_top) g_try_top = g_try_top->prev;
}

void tsc_throw_str(tsc_str_t* message) {
    g_current_error = message ? message : tsc_str_from_lit("(unknown error)", 15);
    if (g_try_top) {
        tsc_try_frame_t* f = g_try_top;
        g_try_top = f->prev;
        longjmp(f->jb, 1);
    }
    fputs("Uncaught: ", stderr);
    if (g_current_error) fwrite(g_current_error->data, 1, g_current_error->len, stderr);
    fputc('\n', stderr);
    exit(1);
}

void tsc_rethrow(void) {
    if (g_current_error) tsc_throw_str(g_current_error);
    exit(1);
}

tsc_str_t* tsc_current_error(void) {
    return g_current_error ? g_current_error : tsc_str_from_lit("(unknown error)", 15);
}
