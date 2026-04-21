#define _POSIX_C_SOURCE 200809L
#define _DEFAULT_SOURCE
#include "tsc_runtime.h"
#include <ctype.h>
#include <dirent.h>
#include <errno.h>
#include <libgen.h>
#include <limits.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <time.h>
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

double tsc_str_length(const tsc_str_t* s) { return (double)s->len; }

tsc_str_t* tsc_str_char_at(const tsc_str_t* s, double idx) {
    size_t i = (size_t)idx;
    if (idx < 0 || i >= s->len) return tsc_str_from_lit("", 0);
    tsc_str_t* out = str_alloc(1);
    ((char*)out->data)[0] = s->data[i];
    return out;
}

double tsc_str_index_of(const tsc_str_t* h, const tsc_str_t* n) {
    if (n->len == 0) return 0.0;
    if (n->len > h->len) return -1.0;
    for (size_t i = 0; i + n->len <= h->len; i++) {
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

tsc_str_t* tsc_str_trim(const tsc_str_t* s) {
    size_t i = 0, j = s->len;
    while (i < j && isspace((unsigned char)s->data[i])) i++;
    while (j > i && isspace((unsigned char)s->data[j - 1])) j--;
    tsc_str_t* r = str_alloc(j - i);
    memcpy((char*)r->data, s->data + i, j - i);
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

/* ---------------- RegExp (POSIX-backed) ---------------- */

static size_t translate_js_re(const char* js, size_t len, char* out, size_t cap) {
    size_t pos = 0;
    for (size_t i = 0; i < len && pos + 32 < cap; i++) {
        char c = js[i];
        if (c == '\\' && i + 1 < len) {
            char next = js[i + 1];
            const char* rep = NULL;
            switch (next) {
                case 'd': rep = "[0-9]"; break;
                case 'D': rep = "[^0-9]"; break;
                case 'w': rep = "[A-Za-z0-9_]"; break;
                case 'W': rep = "[^A-Za-z0-9_]"; break;
                case 's': rep = "[ \t\n\r\f\v]"; break;
                case 'S': rep = "[^ \t\n\r\f\v]"; break;
                default:
                    out[pos++] = c;
                    out[pos++] = next;
                    i++;
                    continue;
            }
            size_t n = strlen(rep);
            memcpy(out + pos, rep, n);
            pos += n;
            i++;
            continue;
        }
        out[pos++] = c;
    }
    out[pos] = '\0';
    return pos;
}

tsc_regexp_t* tsc_regexp_new(const tsc_str_t* pattern, const tsc_str_t* flags) {
    tsc_regexp_t* r = (tsc_regexp_t*)TSC_GC_MALLOC(sizeof(tsc_regexp_t));
    r->source = (tsc_str_t*)pattern;
    r->flags = (tsc_str_t*)flags;
    r->global = false;
    r->ignore_case = false;
    r->multiline = false;
    if (flags) {
        for (size_t i = 0; i < flags->len; i++) {
            switch (flags->data[i]) {
                case 'g': r->global = true; break;
                case 'i': r->ignore_case = true; break;
                case 'm': r->multiline = true; break;
            }
        }
    }
    char buf[4096];
    translate_js_re(pattern->data, pattern->len, buf, sizeof buf);
    int cflags = REG_EXTENDED;
    if (r->ignore_case) cflags |= REG_ICASE;
    if (r->multiline) cflags |= REG_NEWLINE;
    int rc = regcomp(&r->re, buf, cflags);
    r->compiled = (rc == 0);
    return r;
}

bool tsc_regexp_test(const tsc_regexp_t* re, const tsc_str_t* s) {
    if (!re->compiled) return false;
    char* c = cstr_dup(s);
    int rc = regexec(&re->re, c, 0, NULL, 0);
    free(c);
    return rc == 0;
}

tsc_array_t* tsc_str_match_regex(const tsc_str_t* s, const tsc_regexp_t* re) {
    if (!re->compiled) return NULL;
    tsc_array_t* a = tsc_array_new(sizeof(tsc_str_t*), 4);
    char* c = cstr_dup(s);
    const char* cur = c;
    const char* end = c + s->len;
    regmatch_t m;
    while (cur < end) {
        int rc = regexec(&re->re, cur, 1, &m, cur == c ? 0 : REG_NOTBOL);
        if (rc != 0 || m.rm_so < 0) break;
        size_t n = (size_t)(m.rm_eo - m.rm_so);
        tsc_str_t* match = str_alloc(n);
        memcpy((char*)match->data, cur + m.rm_so, n);
        tsc_array_push_raw(a, &match);
        if (!re->global) break;
        if (m.rm_eo == m.rm_so) cur++;
        else cur += m.rm_eo;
    }
    free(c);
    return a->len > 0 ? a : NULL;
}

tsc_str_t* tsc_str_replace_regex(const tsc_str_t* s, const tsc_regexp_t* re, const tsc_str_t* repl) {
    if (!re->compiled) return (tsc_str_t*)s;
    char* src = cstr_dup(s);
    size_t cap = s->len + 64;
    char* out = (char*)malloc(cap);
    size_t pos = 0;
    const char* cur = src;
    const char* end = src + s->len;
    regmatch_t m;
    while (cur < end) {
        int rc = regexec(&re->re, cur, 1, &m, cur == src ? 0 : REG_NOTBOL);
        if (rc != 0 || m.rm_so < 0) {
            size_t n = (size_t)(end - cur);
            if (pos + n >= cap) { cap = pos + n + 32; out = (char*)realloc(out, cap); }
            memcpy(out + pos, cur, n);
            pos += n;
            break;
        }
        size_t pre = (size_t)m.rm_so;
        if (pos + pre + repl->len >= cap) {
            cap = pos + pre + repl->len + 64;
            out = (char*)realloc(out, cap);
        }
        memcpy(out + pos, cur, pre); pos += pre;
        memcpy(out + pos, repl->data, repl->len); pos += repl->len;
        if (m.rm_eo == m.rm_so) {
            if (cur + m.rm_eo < end) {
                if (pos + 1 >= cap) { cap *= 2; out = (char*)realloc(out, cap); }
                out[pos++] = cur[m.rm_eo];
                cur += m.rm_eo + 1;
            } else {
                break;
            }
        } else {
            cur += m.rm_eo;
        }
        if (!re->global) {
            size_t n = (size_t)(end - cur);
            if (pos + n >= cap) { cap = pos + n + 32; out = (char*)realloc(out, cap); }
            memcpy(out + pos, cur, n);
            pos += n;
            break;
        }
    }
    free(src);
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
    char* src = cstr_dup(s);
    const char* cur = src;
    const char* end = src + s->len;
    regmatch_t m;
    while (cur < end) {
        int rc = regexec(&re->re, cur, 1, &m, cur == src ? 0 : REG_NOTBOL);
        if (rc != 0 || m.rm_so < 0) break;
        size_t pre = (size_t)m.rm_so;
        tsc_str_t* part = str_alloc(pre);
        if (pre > 0) memcpy((char*)part->data, cur, pre);
        tsc_array_push_raw(a, &part);
        if (m.rm_eo == m.rm_so) {
            if (cur + m.rm_eo < end) cur += m.rm_eo + 1;
            else break;
        } else {
            cur += m.rm_eo;
        }
    }
    size_t n = (size_t)(end - cur);
    tsc_str_t* tail = str_alloc(n);
    if (n > 0) memcpy((char*)tail->data, cur, n);
    tsc_array_push_raw(a, &tail);
    free(src);
    return a;
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

double tsc_array_length(const tsc_array_t* a) { return (double)a->len; }

void tsc_array_oob(const tsc_array_t* a, double i) { (void)a; (void)i; }

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

static void console_write(FILE* f, size_t n, va_list ap) {
    for (size_t i = 0; i < n; i++) {
        if (i > 0) fputc(' ', f);
        tsc_str_t* s = va_arg(ap, tsc_str_t*);
        if (s && s->len > 0) fwrite(s->data, 1, s->len, f);
    }
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
