#include "tsc_internal.h"

/* ---------------- strings ---------------- */

static inline size_t fast_itoa(char* dst, int64_t n);

tsc_str_t* str_alloc(size_t len) {
    tsc_str_t* s = (tsc_str_t*)TSC_GC_MALLOC(sizeof(tsc_str_t));
    char* buf = (char*)TSC_GC_MALLOC_ATOMIC(len + 1);
    buf[len] = '\0';
    s->len = len;
    s->data = buf;
    s->hash = 0;
    return s;
}

tsc_str_t* tsc_str_from_lit(const char* data, size_t len) {
    tsc_str_t* s = (tsc_str_t*)TSC_GC_MALLOC(sizeof(tsc_str_t));
    s->len = len;
    s->data = data;
    s->hash = 0;
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

tsc_str_t* tsc_str_raw(tsc_value_t template_value, const tsc_array_t* substitutions) {
    if (tsc_value_is_nullish(template_value)) {
        tsc_throw_str(tsc_str_from_cstr("String.raw template must not be null or undefined"));
    }
    tsc_value_t raw = tsc_value_get_prop(template_value, tsc_str_from_lit("raw", 3));
    tsc_value_t length_value = tsc_value_get_prop(raw, tsc_str_from_lit("length", 6));
    double length_number = tsc_value_as_num(length_value);
    size_t length = (isfinite(length_number) && length_number > 0.0)
        ? (size_t)floor(length_number)
        : 0;
    tsc_str_t* result = tsc_str_from_lit("", 0);
    for (size_t index = 0; index < length; index++) {
        tsc_value_t segment = tsc_value_get_prop(raw, tsc_str_from_num((double)index));
        result = tsc_str_concat(result, tsc_value_to_string(segment));
        if (substitutions && index < substitutions->len) {
            tsc_value_t substitution = TSC_ARR(tsc_value_t, substitutions, index);
            result = tsc_str_concat(result, tsc_value_to_string(substitution));
        } else if (index + 1 < length) {
            result = tsc_str_concat(result, tsc_str_from_lit("undefined", 9));
        }
    }
    return result;
}

tsc_str_t* tsc_str_concat_lit_int(const char* lit, size_t lit_len, int64_t n) {
    char num[21];
    size_t num_len = fast_itoa(num, n);
    tsc_str_t* s = str_alloc(lit_len + num_len);
    memcpy((char*)s->data, lit, lit_len);
    memcpy((char*)s->data + lit_len, num, num_len);
    return s;
}

tsc_str_t* tsc_str_concat_int_lit(int64_t n, const char* lit, size_t lit_len) {
    char num[21];
    size_t num_len = fast_itoa(num, n);
    tsc_str_t* s = str_alloc(num_len + lit_len);
    memcpy((char*)s->data, num, num_len);
    memcpy((char*)s->data + num_len, lit, lit_len);
    return s;
}

tsc_str_t* tsc_str_concat_lit_num(const char* lit, size_t lit_len, double n) {
    if (n == (double)(int64_t)n && n > -1e16 && n < 1e16) {
        return tsc_str_concat_lit_int(lit, lit_len, (int64_t)n);
    }
    return tsc_str_concat(tsc_str_from_lit(lit, lit_len), tsc_str_from_num(n));
}

tsc_str_t* tsc_str_concat_num_lit(double n, const char* lit, size_t lit_len) {
    if (n == (double)(int64_t)n && n > -1e16 && n < 1e16) {
        return tsc_str_concat_int_lit((int64_t)n, lit, lit_len);
    }
    return tsc_str_concat(tsc_str_from_num(n), tsc_str_from_lit(lit, lit_len));
}

/* Variadic n-way concat — single str_alloc + n memcpy. Used by the emitter
 * when it folds a chain of `+` over strings (e.g. `s + "x" + j`) into one
 * call, dropping N-1 intermediate allocations + their byte copies. */
tsc_str_t* tsc_str_concat_n(size_t n, ...) {
    va_list ap;
    size_t total = 0;
    va_start(ap, n);
    /* Two-pass would need a heap copy of pointers; use an inline cap of 16
     * args (covers nearly all source-level chains) with a heap fallback. */
    enum { INLINE_CAP = 16 };
    const tsc_str_t* inline_parts[INLINE_CAP];
    const tsc_str_t** parts = inline_parts;
    if (n > INLINE_CAP) parts = (const tsc_str_t**)TSC_GC_MALLOC(n * sizeof(*parts));
    for (size_t i = 0; i < n; i++) {
        const tsc_str_t* p = va_arg(ap, const tsc_str_t*);
        parts[i] = p;
        total += p->len;
    }
    va_end(ap);
    tsc_str_t* s = str_alloc(total);
    char* dst = (char*)s->data;
    for (size_t i = 0; i < n; i++) {
        memcpy(dst, parts[i]->data, parts[i]->len);
        dst += parts[i]->len;
    }
    return s;
}

/* Inline integer to decimal: faster than snprintf("%lld") in hot string,
 * JSON, and array-index paths. Returns chars written. */
static inline size_t fast_itoa(char* dst, int64_t n) {
    char tmp[21];
    size_t i = sizeof tmp;
    bool neg = n < 0;
    uint64_t u = neg ? (uint64_t)-(n + 1) + 1 : (uint64_t)n;
    do {
        tmp[--i] = (char)('0' + (u % 10));
        u /= 10;
    } while (u > 0);
    if (neg) tmp[--i] = '-';
    size_t k = sizeof tmp - i;
    memcpy(dst, tmp + i, k);
    return k;
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
        size_t int_len = fast_itoa(buf, (int64_t)n);
        tsc_str_t* s = str_alloc(int_len);
        memcpy((char*)s->data, buf, int_len);
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

tsc_str_t* tsc_str_from_int(int64_t n) {
    char buf[21];
    size_t len = fast_itoa(buf, n);
    tsc_str_t* s = str_alloc(len);
    memcpy((char*)s->data, buf, len);
    return s;
}

tsc_str_t* tsc_str_from_num_radix(double n, double radix) {
    static const char digits[] = "0123456789abcdefghijklmnopqrstuvwxyz";
    int base = (int)radix;
    if (base < 2 || base > 36) tsc_throw_str(tsc_str_from_cstr("Number.toString: radix must be 2..36"));
    if (base == 10 || isnan(n) || isinf(n)) return tsc_str_from_num(n);
    if (n == 0.0) return tsc_str_from_lit("0", 1);

    double whole;
    double frac = modf(fabs(n), &whole);
    char rev[256];
    size_t rev_len = 0;
    while (whole >= 1.0 && rev_len < sizeof rev) {
        int digit = (int)fmod(whole, (double)base);
        if (digit < 0) digit = 0;
        if (digit >= base) digit = base - 1;
        rev[rev_len++] = digits[digit];
        whole = floor(whole / (double)base);
    }
    if (whole >= 1.0) tsc_throw_str(tsc_str_from_cstr("Number.toString: magnitude too large for radix conversion"));

    char out[512];
    size_t pos = 0;
    if (n < 0) out[pos++] = '-';
    if (rev_len == 0) {
        out[pos++] = '0';
    } else {
        while (rev_len > 0) out[pos++] = rev[--rev_len];
    }

    if (frac > 0.0) {
        out[pos++] = '.';
        size_t frac_start = pos;
        for (int i = 0; i < 64 && frac > 0.0 && pos + 1 < sizeof out; i++) {
            frac *= (double)base;
            int digit = (int)floor(frac);
            if (digit < 0) digit = 0;
            if (digit >= base) digit = base - 1;
            out[pos++] = digits[digit];
            frac -= (double)digit;
        }
        while (pos > frac_start && out[pos - 1] == '0') pos--;
        if (pos == frac_start) pos--;
    }
    out[pos] = '\0';
    return tsc_str_from_cstr(out);
}

int number_fraction_digits(double value) {
    if (isnan(value)) return 0;
    if (isinf(value)) tsc_throw_str(tsc_str_from_cstr("Number.toFixed: digits must be finite"));
    int digits = (int)(value < 0 ? ceil(value) : floor(value));
    if (digits < 0 || digits > 100) tsc_throw_str(tsc_str_from_cstr("Number.toFixed: digits must be 0..100"));
    return digits;
}

int number_exponential_fraction_digits(double value) {
    if (isnan(value)) return 0;
    if (isinf(value)) tsc_throw_str(tsc_str_from_cstr("Number.toExponential: digits must be finite"));
    int digits = (int)(value < 0 ? ceil(value) : floor(value));
    if (digits < 0 || digits > 100) tsc_throw_str(tsc_str_from_cstr("Number.toExponential: digits must be 0..100"));
    return digits;
}

int number_precision_digits(double value) {
    if (isnan(value) || isinf(value)) tsc_throw_str(tsc_str_from_cstr("Number.toPrecision: precision must be finite"));
    int digits = (int)(value < 0 ? ceil(value) : floor(value));
    if (digits < 1 || digits > 100) tsc_throw_str(tsc_str_from_cstr("Number.toPrecision: precision must be 1..100"));
    return digits;
}

tsc_str_t* tsc_str_from_num_fixed(double n, double fraction_digits) {
    int digits = number_fraction_digits(fraction_digits);
    if (isnan(n) || isinf(n)) return tsc_str_from_num(n);
    if (fabs(n) >= 1e21) return tsc_str_from_num(n);
    if (n == 0.0) n = 0.0;

    char buf[160];
    int len = snprintf(buf, sizeof buf, "%.*f", digits, n);
    if (len < 0 || (size_t)len >= sizeof buf) tsc_panic("Number.toFixed: formatted output too large");
    tsc_str_t* s = str_alloc((size_t)len);
    memcpy((char*)s->data, buf, (size_t)len);
    return s;
}

tsc_str_t* tsc_str_from_num_exponential(double n, double fraction_digits, bool has_digits) {
    if (isnan(n) || isinf(n)) return tsc_str_from_num(n);
    if (n == 0.0) n = 0.0;

    int digits = has_digits ? number_exponential_fraction_digits(fraction_digits) : 15;
    char raw[192];
    int raw_len = snprintf(raw, sizeof raw, "%.*e", has_digits ? digits + 1 : digits, n);
    if (raw_len < 0 || (size_t)raw_len >= sizeof raw) tsc_panic("Number.toExponential: formatted output too large");

    char* e = strchr(raw, 'e');
    if (!e) tsc_panic("Number.toExponential: formatted output missing exponent");
    *e = '\0';
    int exp_value = atoi(e + 1);

    char mantissa[128];
    size_t mantissa_len = 0;
    if (has_digits) {
        const char* p = raw;
        bool negative = false;
        if (*p == '-') {
            negative = true;
            p++;
        }

        char significant[128];
        int sig_len = 0;
        for (; *p; p++) {
            if (isdigit((unsigned char)*p)) {
                if (sig_len + 1 >= (int)sizeof significant) tsc_panic("Number.toExponential: mantissa too large");
                significant[sig_len++] = *p;
            }
        }

        int keep = digits + 1;
        while (sig_len <= keep) significant[sig_len++] = '0';
        if (significant[keep] >= '5') {
            bool carry = true;
            for (int i = keep - 1; i >= 0; i--) {
                if (significant[i] != '9') {
                    significant[i]++;
                    carry = false;
                    break;
                }
                significant[i] = '0';
            }
            if (carry) {
                significant[0] = '1';
                for (int i = 1; i < keep; i++) significant[i] = '0';
                exp_value++;
            }
        }

        if (negative) mantissa[mantissa_len++] = '-';
        mantissa[mantissa_len++] = significant[0];
        if (digits > 0) {
            mantissa[mantissa_len++] = '.';
            for (int i = 1; i < keep; i++) mantissa[mantissa_len++] = significant[i];
        }
        mantissa[mantissa_len] = '\0';
    } else {
        mantissa_len = strlen(raw);
        while (mantissa_len > 0 && raw[mantissa_len - 1] == '0') mantissa_len--;
        if (mantissa_len > 0 && raw[mantissa_len - 1] == '.') mantissa_len--;
        if (mantissa_len >= sizeof mantissa) tsc_panic("Number.toExponential: mantissa too large");
        memcpy(mantissa, raw, mantissa_len);
        mantissa[mantissa_len] = '\0';
    }

    char out[192];
    int len = snprintf(out, sizeof out, "%se%+d", mantissa, exp_value);
    if (len < 0 || (size_t)len >= sizeof out) tsc_panic("Number.toExponential: formatted output too large");
    tsc_str_t* s = str_alloc((size_t)len);
    memcpy((char*)s->data, out, (size_t)len);
    return s;
}

tsc_str_t* tsc_str_from_num_precision(double n, double precision, bool has_precision) {
    if (!has_precision) return tsc_str_from_num(n);
    int digits = number_precision_digits(precision);
    if (isnan(n) || isinf(n)) return tsc_str_from_num(n);
    if (n == 0.0) n = 0.0;

    char raw[192];
    int raw_len = snprintf(raw, sizeof raw, "%.*e", digits, n);
    if (raw_len < 0 || (size_t)raw_len >= sizeof raw) tsc_panic("Number.toPrecision: formatted output too large");

    char* e = strchr(raw, 'e');
    if (!e) tsc_panic("Number.toPrecision: formatted output missing exponent");
    *e = '\0';
    int exp_value = atoi(e + 1);

    const char* p = raw;
    bool negative = false;
    if (*p == '-') {
        negative = true;
        p++;
    }

    char significant[128];
    int sig_len = 0;
    for (; *p; p++) {
        if (isdigit((unsigned char)*p)) {
            if (sig_len + 1 >= (int)sizeof significant) tsc_panic("Number.toPrecision: mantissa too large");
            significant[sig_len++] = *p;
        }
    }
    while (sig_len <= digits) significant[sig_len++] = '0';

    if (significant[digits] >= '5') {
        bool carry = true;
        for (int i = digits - 1; i >= 0; i--) {
            if (significant[i] != '9') {
                significant[i]++;
                carry = false;
                break;
            }
            significant[i] = '0';
        }
        if (carry) {
            significant[0] = '1';
            for (int i = 1; i < digits; i++) significant[i] = '0';
            exp_value++;
        }
    }

    char out[192];
    size_t pos = 0;
    if (negative) out[pos++] = '-';

    if (exp_value < -6 || exp_value >= digits) {
        out[pos++] = significant[0];
        if (digits > 1) {
            out[pos++] = '.';
            for (int i = 1; i < digits; i++) out[pos++] = significant[i];
        }
        int len = snprintf(out + pos, sizeof out - pos, "e%+d", exp_value);
        if (len < 0 || pos + (size_t)len >= sizeof out) tsc_panic("Number.toPrecision: formatted output too large");
        pos += (size_t)len;
    } else if (exp_value >= 0) {
        int before_dot = exp_value + 1;
        for (int i = 0; i < before_dot; i++) out[pos++] = i < digits ? significant[i] : '0';
        if (before_dot < digits) {
            out[pos++] = '.';
            for (int i = before_dot; i < digits; i++) out[pos++] = significant[i];
        }
    } else {
        out[pos++] = '0';
        out[pos++] = '.';
        for (int i = 0; i < -exp_value - 1; i++) out[pos++] = '0';
        for (int i = 0; i < digits; i++) out[pos++] = significant[i];
    }

    if (pos >= sizeof out) tsc_panic("Number.toPrecision: formatted output too large");
    out[pos] = '\0';
    tsc_str_t* s = str_alloc(pos);
    memcpy((char*)s->data, out, pos);
    return s;
}

tsc_str_t* tsc_str_from_bool(bool b) {
    static const char T[] = "true";
    static const char F[] = "false";
    return b ? tsc_str_from_lit(T, 4) : tsc_str_from_lit(F, 5);
}

uint16_t to_uint16_code_unit(double n) {
    if (isnan(n) || isinf(n)) return 0;
    int64_t i = (int64_t)n;
    return (uint16_t)(i & 0xffff);
}

size_t utf8_len_for_code_point(uint32_t cp) {
    if (cp <= 0x7f) return 1;
    if (cp <= 0x7ff) return 2;
    if (cp <= 0xffff) return 3;
    return 4;
}

size_t write_utf8_code_point(char* out, uint32_t cp) {
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

bool decode_utf8_at(const tsc_str_t* s, size_t pos, uint32_t* cp, size_t* adv) {
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

bool is_high_surrogate(uint16_t u) { return u >= 0xd800 && u <= 0xdbff; }
bool is_low_surrogate(uint16_t u) { return u >= 0xdc00 && u <= 0xdfff; }

uint32_t surrogate_pair_to_code_point(uint16_t hi, uint16_t lo) {
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

uint32_t to_valid_code_point(double n) {
    if (!isfinite(n) || floor(n) != n || n < 0.0 || n > 0x10ffff) {
        tsc_throw_str(tsc_str_from_cstr("String.fromCodePoint: invalid code point"));
    }
    return (uint32_t)n;
}

tsc_str_t* tsc_str_from_code_point_n(size_t n, ...) {
    uint32_t* cps = (uint32_t*)TSC_GC_MALLOC_ATOMIC(sizeof(uint32_t) * (n ? n : 1));
    va_list ap;
    va_start(ap, n);
    for (size_t i = 0; i < n; i++) {
        cps[i] = to_valid_code_point(va_arg(ap, double));
    }
    va_end(ap);

    size_t len = 0;
    for (size_t i = 0; i < n; i++) {
        len += utf8_len_for_code_point(cps[i]);
    }

    tsc_str_t* s = str_alloc(len);
    char* out = (char*)s->data;
    size_t pos = 0;
    for (size_t i = 0; i < n; i++) {
        pos += write_utf8_code_point(out + pos, cps[i]);
    }
    return s;
}

bool tsc_str_eq(const tsc_str_t* a, const tsc_str_t* b) {
    if (a == b) return true;
    if (a->len != b->len) return false;
    uint64_t ah = a->hash;
    uint64_t bh = b->hash;
    if (ah != 0 && bh != 0 && ah != bh) return false;
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

double tsc_str_char_code_at(const tsc_str_t* s, double idx) {
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
            uint16_t hi = (uint16_t)(0xd800u + (shifted >> 10));
            uint16_t lo = (uint16_t)(0xdc00u + (shifted & 0x3ffu));
            if (code_unit_index == target) return (double)hi;
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

int64_t string_clamped_position(double value, int64_t len) {
    if (isnan(value)) return 0;
    if (isinf(value)) return value < 0 ? 0 : len;
    double truncated = value < 0 ? ceil(value) : floor(value);
    if (truncated < 0) return 0;
    if (truncated > (double)len) return len;
    return (int64_t)truncated;
}

double tsc_str_index_of(const tsc_str_t* h, const tsc_str_t* n, double position) {
    int64_t start_i = string_clamped_position(position, (int64_t)h->len);
    size_t start = (size_t)start_i;
    if (n->len == 0) return (double)start;
    if (n->len > h->len) return -1.0;
    for (size_t i = start; i + n->len <= h->len; i++) {
        if (memcmp(h->data + i, n->data, n->len) == 0) return (double)i;
    }
    return -1.0;
}

double tsc_str_last_index_of(const tsc_str_t* h, const tsc_str_t* n, double position) {
    int64_t pos_i = string_clamped_position(position, (int64_t)h->len);
    size_t pos = (size_t)pos_i;
    if (n->len == 0) return (double)pos;
    if (n->len > h->len) return -1.0;
    size_t max_start = h->len - n->len;
    size_t i = (pos > max_start ? max_start : pos) + 1;
    while (i > 0) {
        i--;
        if (memcmp(h->data + i, n->data, n->len) == 0) return (double)i;
    }
    return -1.0;
}

bool tsc_str_includes(const tsc_str_t* h, const tsc_str_t* n, double position) {
    return tsc_str_index_of(h, n, position) >= 0;
}

bool tsc_str_starts_with(const tsc_str_t* s, const tsc_str_t* p, double position) {
    int64_t start_i = string_clamped_position(position, (int64_t)s->len);
    size_t start = (size_t)start_i;
    if (p->len > s->len - start) return false;
    return memcmp(s->data + start, p->data, p->len) == 0;
}

bool tsc_str_ends_with(const tsc_str_t* s, const tsc_str_t* p, double end_position) {
    int64_t end_i = string_clamped_position(end_position, (int64_t)s->len);
    size_t end = (size_t)end_i;
    if (p->len > end) return false;
    return memcmp(s->data + (end - p->len), p->data, p->len) == 0;
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

int64_t substring_index(double value, int64_t len) {
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

int64_t substr_start_index(double value, int64_t len) {
    if (isnan(value)) return 0;
    if (isinf(value)) return value < 0 ? 0 : len;
    int64_t i = (int64_t)(value < 0 ? ceil(value) : floor(value));
    if (i < 0) i = len + i;
    if (i < 0) return 0;
    if (i > len) return len;
    return i;
}

int64_t substr_count(double value, int64_t remaining) {
    if (isnan(value) || value <= 0) return 0;
    if (isinf(value)) return value < 0 ? 0 : remaining;
    int64_t n = (int64_t)(value < 0 ? ceil(value) : floor(value));
    if (n < 0) return 0;
    if (n > remaining) return remaining;
    return n;
}

tsc_str_t* tsc_str_substr(const tsc_str_t* s, double start, double length) {
    int64_t slen = (int64_t)s->len;
    int64_t i0 = substr_start_index(start, slen);
    int64_t n = substr_count(length, slen - i0);
    tsc_str_t* r = str_alloc((size_t)n);
    memcpy((char*)r->data, s->data + i0, (size_t)n);
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
        tsc_throw_str(tsc_str_from_cstr("String.normalize: form must be NFC, NFD, NFKC, or NFKD"));
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
            size_t cap = s->len + repl->len + 64;
            char* out = (char*)malloc(cap);
            size_t pos = 0;
            replace_append(&out, &pos, &cap, s->data, i);
            replace_append_string_expanded(&out, &pos, &cap, s, repl, i, i + search->len);
            replace_append(&out, &pos, &cap, s->data + i + search->len, s->len - i - search->len);
            tsc_str_t* r = str_alloc(pos);
            memcpy((char*)r->data, out, pos);
            free(out);
            return r;
        }
    }
    return (tsc_str_t*)s;
}

tsc_str_t* tsc_str_replace_all(const tsc_str_t* s, const tsc_str_t* search, const tsc_str_t* repl) {
    if (search->len == 0) return (tsc_str_t*)s;
    size_t cap = s->len + 64;
    char* out = (char*)malloc(cap);
    size_t src = 0;
    size_t pos = 0;
    bool changed = false;
    while (src < s->len) {
        if (src + search->len <= s->len &&
            memcmp(s->data + src, search->data, search->len) == 0) {
            changed = true;
            replace_append_string_expanded(&out, &pos, &cap, s, repl, src, src + search->len);
            src += search->len;
        } else {
            replace_append(&out, &pos, &cap, s->data + src, 1);
            src++;
        }
    }
    if (!changed) {
        free(out);
        return (tsc_str_t*)s;
    }
    tsc_str_t* r = str_alloc(pos);
    memcpy((char*)r->data, out, pos);
    free(out);
    return r;
}

uint32_t split_limit_from_num(double limit) {
    if (isnan(limit) || limit == 0.0 || isinf(limit)) return 0;
    double integral = limit < 0.0 ? ceil(limit) : floor(limit);
    double mod = fmod(integral, 4294967296.0);
    if (mod < 0.0) mod += 4294967296.0;
    if (mod >= 4294967295.0) return UINT32_MAX;
    return (uint32_t)mod;
}

tsc_array_t* tsc_str_split_limit(const tsc_str_t* s, const tsc_str_t* sep, uint32_t limit) {
    tsc_array_t* a = tsc_array_new(sizeof(tsc_str_t*), 4);
    if (limit == 0) return a;
    if (sep->len == 0) {
        for (size_t i = 0; i < s->len && a->len < limit; i++) {
            tsc_str_t* c = str_alloc(1);
            ((char*)c->data)[0] = s->data[i];
            tsc_array_push_raw(a, &c);
        }
        return a;
    }
    size_t i = 0;
    while (i <= s->len && a->len < limit) {
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

tsc_array_t* tsc_str_split(const tsc_str_t* s, const tsc_str_t* sep) {
    return tsc_str_split_limit(s, sep, UINT32_MAX);
}

tsc_array_t* tsc_str_split_limit_num(const tsc_str_t* s, const tsc_str_t* sep, double limit) {
    return tsc_str_split_limit(s, sep, split_limit_from_num(limit));
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

/* ---------------- JSON build buffer ---------------- */

void tsc_jsonbuf_init(tsc_jsonbuf_t* b) {
    /* Larger initial cap saves reallocations on the typical "stringify a
     * small object" case (where the result is hundreds of bytes). */
    b->cap = 1024;
    b->len = 0;
    b->data = (char*)TSC_GC_MALLOC_ATOMIC(b->cap);
}

void tsc_jsonbuf_reserve(tsc_jsonbuf_t* b, size_t need) {
    if (b->len + need <= b->cap) return;
    size_t cap = b->cap ? b->cap : 64;
    while (cap < b->len + need) cap *= 2;
    char* nd = (char*)TSC_GC_MALLOC_ATOMIC(cap);
    if (b->len > 0) memcpy(nd, b->data, b->len);
    b->data = nd;
    b->cap = cap;
}

void tsc_jsonbuf_append(tsc_jsonbuf_t* b, const char* p, size_t n) {
    tsc_jsonbuf_reserve(b, n);
    memcpy(b->data + b->len, p, n);
    b->len += n;
}

void tsc_jsonbuf_byte(tsc_jsonbuf_t* b, char c) {
    tsc_jsonbuf_reserve(b, 1);
    b->data[b->len++] = c;
}

void tsc_jsonbuf_int(tsc_jsonbuf_t* b, int64_t n) {
    tsc_jsonbuf_reserve(b, 21);
    b->len += fast_itoa(b->data + b->len, n);
}

void tsc_jsonbuf_num(tsc_jsonbuf_t* b, double n) {
    if (isnan(n) || isinf(n)) { tsc_jsonbuf_append(b, "null", 4); return; }
    if (n == 0.0) { tsc_jsonbuf_byte(b, '0'); return; }
    if (n == (double)(int64_t)n && n > -1e16 && n < 1e16) {
        tsc_jsonbuf_int(b, (int64_t)n);
        return;
    }
    if (n > -4503599627370495.0 && n < 4503599627370495.0) {
        double twice_d = n * 2.0;
        int64_t twice = (int64_t)twice_d;
        if ((double)twice == twice_d && (twice & 1) != 0) {
            if (twice < 0) {
                tsc_jsonbuf_byte(b, '-');
                twice = -twice;
            }
            tsc_jsonbuf_int(b, twice / 2);
            tsc_jsonbuf_append(b, ".5", 2);
            return;
        }
    }
    char buf[64];
    for (int prec = 1; prec <= 17; prec++) {
        snprintf(buf, sizeof buf, "%.*g", prec, n);
        double rt = strtod(buf, NULL);
        if (rt == n) break;
    }
    tsc_jsonbuf_append(b, buf, strlen(buf));
}

void tsc_jsonbuf_bool(tsc_jsonbuf_t* b, bool v) {
    if (v) tsc_jsonbuf_append(b, "true", 4);
    else   tsc_jsonbuf_append(b, "false", 5);
}

void tsc_jsonbuf_str(tsc_jsonbuf_t* b, const tsc_str_t* s) {
    bool needs_escape = false;
    for (size_t i = 0; i < s->len; i++) {
        unsigned char c = (unsigned char)s->data[i];
        if (c < 0x20 || c == '"' || c == '\\') {
            needs_escape = true;
            break;
        }
    }
    if (!needs_escape) {
        tsc_jsonbuf_reserve(b, s->len + 2);
        b->data[b->len++] = '"';
        if (s->len > 0) memcpy(b->data + b->len, s->data, s->len);
        b->len += s->len;
        b->data[b->len++] = '"';
        return;
    }
    /* Upper bound: open quote + 6x expansion + close quote. */
    tsc_jsonbuf_reserve(b, s->len * 6 + 2);
    b->data[b->len++] = '"';
    for (size_t i = 0; i < s->len; i++) {
        unsigned char c = (unsigned char)s->data[i];
        switch (c) {
            case '"':  b->data[b->len++] = '\\'; b->data[b->len++] = '"'; break;
            case '\\': b->data[b->len++] = '\\'; b->data[b->len++] = '\\'; break;
            case '\n': b->data[b->len++] = '\\'; b->data[b->len++] = 'n'; break;
            case '\r': b->data[b->len++] = '\\'; b->data[b->len++] = 'r'; break;
            case '\t': b->data[b->len++] = '\\'; b->data[b->len++] = 't'; break;
            case '\b': b->data[b->len++] = '\\'; b->data[b->len++] = 'b'; break;
            case '\f': b->data[b->len++] = '\\'; b->data[b->len++] = 'f'; break;
            default:
                if (c < 0x20) {
                    int n = snprintf(b->data + b->len, b->cap - b->len, "\\u%04x", c);
                    b->len += (size_t)n;
                } else {
                    b->data[b->len++] = (char)c;
                }
        }
    }
    b->data[b->len++] = '"';
}

tsc_str_t* tsc_jsonbuf_finish(tsc_jsonbuf_t* b) {
    tsc_jsonbuf_reserve(b, 1);
    b->data[b->len] = '\0';
    tsc_str_t* s = (tsc_str_t*)TSC_GC_MALLOC(sizeof(tsc_str_t));
    s->len = b->len;
    s->data = b->data;
    s->hash = 0;
    return s;
}



#include <ctype.h>
#include <stdio.h>

static bool is_uri_reserved(char c) {
    switch (c) {
        case ';': case '/': case '?': case ':': case '@': case '&': case '=': case '+': case '$': case ',': return true;
        default: return false;
    }
}

static bool is_uri_unescaped(char c) {
    if (isalnum((unsigned char)c)) return true;
    switch (c) {
        case '-': case '_': case '.': case '!': case '~': case '*': case '\'': case '(': case ')': return true;
        default: return false;
    }
}

static bool is_uri_hash(char c) {
    return c == '#';
}

static tsc_str_t* tsc_encode_uri_impl(const tsc_str_t* s, bool component) {
    size_t out_cap = s->len * 3 + 1;
    char* out = (char*)TSC_GC_MALLOC_ATOMIC(out_cap);
    size_t out_len = 0;
    
    for (size_t i = 0; i < s->len; i++) {
        char c = s->data[i];
        if (is_uri_unescaped(c) || (!component && (is_uri_reserved(c) || is_uri_hash(c)))) {
            out[out_len++] = c;
        } else {
            snprintf(out + out_len, 4, "%%%02X", (unsigned char)c);
            out_len += 3;
        }
    }
    out[out_len] = '\0';
    return tsc_str_from_lit(out, out_len);
}

tsc_str_t* tsc_str_encode_uri(const tsc_str_t* s) {
    return tsc_encode_uri_impl(s, false);
}

tsc_str_t* tsc_str_encode_uri_component(const tsc_str_t* s) {
    return tsc_encode_uri_impl(s, true);
}

static int hex_val(char c) {
    if (c >= '0' && c <= '9') return c - '0';
    if (c >= 'a' && c <= 'f') return c - 'a' + 10;
    if (c >= 'A' && c <= 'F') return c - 'A' + 10;
    return -1;
}

static tsc_str_t* tsc_decode_uri_impl(const tsc_str_t* s, bool component) {
    char* out = (char*)TSC_GC_MALLOC_ATOMIC(s->len + 1);
    size_t out_len = 0;
    
    for (size_t i = 0; i < s->len; i++) {
        if (s->data[i] == '%' && i + 2 < s->len) {
            int h1 = hex_val(s->data[i+1]);
            int h2 = hex_val(s->data[i+2]);
            if (h1 != -1 && h2 != -1) {
                char decoded = (char)((h1 << 4) | h2);
                if (!component && is_uri_reserved(decoded)) {
                    out[out_len++] = '%';
                    out[out_len++] = s->data[i+1];
                    out[out_len++] = s->data[i+2];
                } else {
                    out[out_len++] = decoded;
                }
                i += 2;
                continue;
            }
        }
        out[out_len++] = s->data[i];
    }
    out[out_len] = '\0';
    return tsc_str_from_lit(out, out_len);
}

tsc_str_t* tsc_str_decode_uri(const tsc_str_t* s) {
    return tsc_decode_uri_impl(s, false);
}

tsc_str_t* tsc_str_decode_uri_component(const tsc_str_t* s) {
    return tsc_decode_uri_impl(s, true);
}
