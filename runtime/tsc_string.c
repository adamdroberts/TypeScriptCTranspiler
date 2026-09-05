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
    s->symbol_key = NULL;
    s->utf16_len_plus_one = 0;
    s->utf16_cache = NULL;
    return s;
}

tsc_str_t* tsc_str_from_lit(const char* data, size_t len) {
    tsc_str_t* s = (tsc_str_t*)TSC_GC_MALLOC(sizeof(tsc_str_t));
    s->len = len;
    s->data = data;
    s->hash = 0;
    s->symbol_key = NULL;
    s->utf16_len_plus_one = 0;
    s->utf16_cache = NULL;
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

tsc_str_t* tsc_str_concat_parts(const tsc_array_t* parts) {
    size_t total = 0;
    if (parts) {
        for (size_t index = 0; index < parts->len; index++) {
            const tsc_str_t* part = TSC_ARR(tsc_str_t*, parts, index);
            if (part->len > SIZE_MAX - total || part->len == SIZE_MAX - total) {
                tsc_panic("concatenated String is too large");
            }
            total += part->len;
        }
    }

    tsc_str_t* result = str_alloc(total);
    char* destination = (char*)result->data;
    if (parts) {
        for (size_t index = 0; index < parts->len; index++) {
            const tsc_str_t* part = TSC_ARR(tsc_str_t*, parts, index);
            memcpy(destination, part->data, part->len);
            destination += part->len;
        }
    }
    return result;
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
    if (!isfinite(n) || n == 0.0) return 0;
    double modulo = fmod(trunc(n), 65536.0);
    if (modulo < 0.0) modulo += 65536.0;
    return (uint16_t)modulo;
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

static bool is_utf8_continuation(unsigned char byte) {
    return byte >= 0x80 && byte <= 0xbf;
}

/*
 * Validate one exact canonical UTF-8 sequence. The internal string encoding
 * is WTF-8, so callers that operate on ECMAScript code units may admit the
 * three-byte surrogate forms; scalar-only boundaries such as URI Decode do
 * not. No caller infers validity merely from the number of fixture shapes.
 */
static bool decode_canonical_utf8(
    const unsigned char* bytes,
    size_t length,
    bool allow_surrogate,
    uint32_t* code_point
) {
    if (!bytes || length == 0 || length > 4) return false;
    unsigned char first = bytes[0];
    uint32_t value = 0;
    if (length == 1) {
        if (first > 0x7f) return false;
        value = first;
    } else if (length == 2) {
        if (first < 0xc2 || first > 0xdf || !is_utf8_continuation(bytes[1])) {
            return false;
        }
        value = ((uint32_t)(first & 0x1f) << 6) |
            (uint32_t)(bytes[1] & 0x3f);
    } else if (length == 3) {
        if (first < 0xe0 || first > 0xef ||
            !is_utf8_continuation(bytes[1]) ||
            !is_utf8_continuation(bytes[2])) {
            return false;
        }
        if (first == 0xe0 && bytes[1] < 0xa0) return false;
        if (first == 0xed && !allow_surrogate && bytes[1] >= 0xa0) return false;
        value = ((uint32_t)(first & 0x0f) << 12) |
            ((uint32_t)(bytes[1] & 0x3f) << 6) |
            (uint32_t)(bytes[2] & 0x3f);
    } else {
        if (first < 0xf0 || first > 0xf4 ||
            !is_utf8_continuation(bytes[1]) ||
            !is_utf8_continuation(bytes[2]) ||
            !is_utf8_continuation(bytes[3])) {
            return false;
        }
        if (first == 0xf0 && bytes[1] < 0x90) return false;
        if (first == 0xf4 && bytes[1] > 0x8f) return false;
        value = ((uint32_t)(first & 0x07) << 18) |
            ((uint32_t)(bytes[1] & 0x3f) << 12) |
            ((uint32_t)(bytes[2] & 0x3f) << 6) |
            (uint32_t)(bytes[3] & 0x3f);
    }
    if (!allow_surrogate && value >= 0xd800 && value <= 0xdfff) return false;
    if (value > 0x10ffff) return false;
    if (code_point) *code_point = value;
    return true;
}

static size_t canonical_utf8_width(unsigned char first) {
    if (first <= 0x7f) return 1;
    if (first >= 0xc2 && first <= 0xdf) return 2;
    if (first >= 0xe0 && first <= 0xef) return 3;
    if (first >= 0xf0 && first <= 0xf4) return 4;
    return 0;
}

static bool decode_wtf8_at_strict(
    const tsc_str_t* string,
    size_t offset,
    uint32_t* code_point,
    size_t* width
) {
    if (!string || offset >= string->len) return false;
    const unsigned char* bytes = (const unsigned char*)string->data + offset;
    size_t actual_width = canonical_utf8_width(bytes[0]);
    if (actual_width == 0 || actual_width > string->len - offset) return false;
    if (!decode_canonical_utf8(bytes, actual_width, true, code_point)) return false;
    if (width) *width = actual_width;
    return true;
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

/* Every ECMAScript String algorithm below consumes this one canonical
 * projection.  The immutable backing store is WTF-8, but observable String
 * equality, ordering, indexing and ranges are defined over UTF-16 code
 * units.  A malformed backing store is an internal invariant violation;
 * fail closed instead of letting individual algorithms invent recovery
 * rules. */
typedef struct {
    size_t len;
    const uint16_t* data;
} tsc_utf16_sequence_t;

typedef struct tsc_utf16_storage {
    size_t len;
    uint16_t data[];
} tsc_utf16_storage_t;

static void publish_utf16_length(const tsc_str_t* string, size_t length) {
#ifdef TSC_THREADS
    __atomic_store_n(
        &((tsc_str_t*)string)->utf16_len_plus_one,
        length + 1,
        __ATOMIC_RELAXED
    );
#else
    ((tsc_str_t*)string)->utf16_len_plus_one = length + 1;
#endif
}

static tsc_utf16_sequence_t string_utf16_sequence(const tsc_str_t* string) {
    tsc_utf16_sequence_t sequence = {0, NULL};
    if (!string) return sequence;
#ifdef TSC_THREADS
    const tsc_utf16_storage_t* cached = __atomic_load_n(
        &((tsc_str_t*)string)->utf16_cache,
        __ATOMIC_ACQUIRE
    );
#else
    const tsc_utf16_storage_t* cached =
        (const tsc_utf16_storage_t*)string->utf16_cache;
#endif
    if (cached) {
        sequence.len = cached->len;
        sequence.data = cached->data;
        return sequence;
    }
    if (string->len > (SIZE_MAX - sizeof(tsc_utf16_storage_t)) / sizeof(uint16_t)) {
        tsc_panic("UTF-16 String projection is too large");
    }
    tsc_utf16_storage_t* candidate = (tsc_utf16_storage_t*)TSC_GC_MALLOC_ATOMIC(
        sizeof(tsc_utf16_storage_t) + sizeof(uint16_t) * string->len
    );
    candidate->len = 0;
    size_t offset = 0;
    while (offset < string->len) {
        uint32_t code_point = 0;
        size_t width = 0;
        if (!decode_wtf8_at_strict(string, offset, &code_point, &width)) {
            tsc_panic("invalid internal WTF-8 String storage");
        }
        if (code_point > 0xffff) {
            uint32_t shifted = code_point - 0x10000u;
            candidate->data[candidate->len++] = (uint16_t)(0xd800u + (shifted >> 10));
            candidate->data[candidate->len++] = (uint16_t)(0xdc00u + (shifted & 0x3ffu));
        } else {
            candidate->data[candidate->len++] = (uint16_t)code_point;
        }
        offset += width;
    }
    publish_utf16_length(string, candidate->len);
#ifdef TSC_THREADS
    const tsc_utf16_storage_t* expected = NULL;
    if (__atomic_compare_exchange_n(
        &((tsc_str_t*)string)->utf16_cache,
        &expected,
        candidate,
        false,
        __ATOMIC_RELEASE,
        __ATOMIC_ACQUIRE
    )) {
        cached = candidate;
    } else {
        cached = expected;
    }
#else
    ((tsc_str_t*)string)->utf16_cache = candidate;
    cached = candidate;
#endif
    sequence.len = cached->len;
    sequence.data = cached->data;
    return sequence;
}

static tsc_str_t* string_from_utf16_range(
    const uint16_t* units,
    size_t start,
    size_t count
) {
    size_t byte_length = 0;
    size_t end = start + count;
    for (size_t index = start; index < end; index++) {
        uint32_t code_point = units[index];
        if (is_high_surrogate(units[index]) && index + 1 < end &&
            is_low_surrogate(units[index + 1])) {
            code_point = surrogate_pair_to_code_point(units[index], units[index + 1]);
            index++;
        }
        size_t width = utf8_len_for_code_point(code_point);
        if (byte_length > SIZE_MAX - width) {
            tsc_panic("UTF-16 String materialization is too large");
        }
        byte_length += width;
    }

    tsc_str_t* result = str_alloc(byte_length);
    size_t output_offset = 0;
    for (size_t index = start; index < end; index++) {
        uint32_t code_point = units[index];
        if (is_high_surrogate(units[index]) && index + 1 < end &&
            is_low_surrogate(units[index + 1])) {
            code_point = surrogate_pair_to_code_point(units[index], units[index + 1]);
            index++;
        }
        output_offset += write_utf8_code_point(
            (char*)result->data + output_offset,
            code_point
        );
    }
    publish_utf16_length(result, count);
    return result;
}

static tsc_str_t* string_from_numeric_values(
    const tsc_array_t* values,
    bool code_points
) {
    size_t count = values ? values->len : 0;
    if (count > SIZE_MAX / sizeof(uint32_t) || count > SIZE_MAX / 4) {
        tsc_panic("String static argument collection is too large");
    }
    uint32_t* units = (uint32_t*)TSC_GC_MALLOC_ATOMIC(
        sizeof(uint32_t) * (count ? count : 1)
    );
    for (size_t index = 0; index < count; index++) {
        double numeric = tsc_value_to_number(TSC_ARR(tsc_value_t, values, index));
        units[index] = code_points
            ? to_valid_code_point(numeric)
            : (uint32_t)to_uint16_code_unit(numeric);
    }

    size_t len = 0;
    for (size_t index = 0; index < count; index++) {
        uint32_t code_point = units[index];
        if (units[index] <= 0xffff && is_high_surrogate((uint16_t)units[index]) &&
            index + 1 < count && units[index + 1] <= 0xffff &&
            is_low_surrogate((uint16_t)units[index + 1])) {
            code_point = surrogate_pair_to_code_point(
                (uint16_t)units[index],
                (uint16_t)units[index + 1]
            );
            index++;
        }
        len += utf8_len_for_code_point(code_point);
    }

    tsc_str_t* result = str_alloc(len);
    char* output = (char*)result->data;
    size_t offset = 0;
    for (size_t index = 0; index < count; index++) {
        uint32_t code_point = units[index];
        if (units[index] <= 0xffff && is_high_surrogate((uint16_t)units[index]) &&
            index + 1 < count && units[index + 1] <= 0xffff &&
            is_low_surrogate((uint16_t)units[index + 1])) {
            code_point = surrogate_pair_to_code_point(
                (uint16_t)units[index],
                (uint16_t)units[index + 1]
            );
            index++;
        }
        offset += write_utf8_code_point(output + offset, code_point);
    }
    return result;
}

uint32_t to_valid_code_point(double n) {
    if (!isfinite(n) || floor(n) != n || n < 0.0 || n > 0x10ffff) {
        tsc_throw_error(
            TSC_ERROR_RANGE,
            tsc_str_from_cstr("String.fromCodePoint: invalid code point")
        );
    }
    return (uint32_t)n;
}

tsc_str_t* tsc_str_from_char_code_values(const tsc_array_t* values) {
    return string_from_numeric_values(values, false);
}

tsc_str_t* tsc_str_from_code_point_values(const tsc_array_t* values) {
    return string_from_numeric_values(values, true);
}

bool tsc_str_eq(const tsc_str_t* a, const tsc_str_t* b) {
    if (a == b) return true;
    if (a->symbol_key || b->symbol_key) {
        return a->symbol_key && a->symbol_key == b->symbol_key;
    }
    if (a->len == b->len && memcmp(a->data, b->data, a->len) == 0) return true;
    size_t a_length = tsc_str_utf16_length(a);
    size_t b_length = tsc_str_utf16_length(b);
    if (a_length != b_length) return false;
    uint64_t ah = a->hash;
    uint64_t bh = b->hash;
    if (ah != 0 && bh != 0 && ah != bh) return false;
    tsc_utf16_sequence_t a_sequence = string_utf16_sequence(a);
    tsc_utf16_sequence_t b_sequence = string_utf16_sequence(b);
    return memcmp(
        a_sequence.data,
        b_sequence.data,
        a_sequence.len * sizeof(uint16_t)
    ) == 0;
}

int tsc_str_cmp(const tsc_str_t* a, const tsc_str_t* b) {
    if (a->symbol_key || b->symbol_key) {
        if (!a->symbol_key) return -1;
        if (!b->symbol_key) return 1;
        if (a->symbol_key->id < b->symbol_key->id) return -1;
        if (a->symbol_key->id > b->symbol_key->id) return 1;
        return 0;
    }
    tsc_utf16_sequence_t a_sequence = string_utf16_sequence(a);
    tsc_utf16_sequence_t b_sequence = string_utf16_sequence(b);
    size_t shared = a_sequence.len < b_sequence.len
        ? a_sequence.len
        : b_sequence.len;
    for (size_t index = 0; index < shared; index++) {
        if (a_sequence.data[index] < b_sequence.data[index]) return -1;
        if (a_sequence.data[index] > b_sequence.data[index]) return 1;
    }
    if (a_sequence.len < b_sequence.len) return -1;
    if (a_sequence.len > b_sequence.len) return 1;
    return 0;
}

uint64_t tsc_str_semantic_hash(const tsc_str_t* string) {
    tsc_utf16_sequence_t sequence = string_utf16_sequence(string);
    uint64_t hash = 0xcbf29ce484222325ULL;
    for (size_t index = 0; index < sequence.len; index++) {
        uint16_t unit = sequence.data[index];
        hash ^= (uint64_t)(unit & 0xffu);
        hash *= 0x100000001b3ULL;
        hash ^= (uint64_t)(unit >> 8);
        hash *= 0x100000001b3ULL;
    }
    return hash;
}

double tsc_str_locale_compare(const tsc_str_t* a, const tsc_str_t* b) {
    int c = tsc_str_cmp(a, b);
    return c < 0 ? -1.0 : c > 0 ? 1.0 : 0.0;
}

size_t tsc_str_utf16_length(const tsc_str_t* s) {
    if (!s) return 0;
#ifdef TSC_THREADS
    size_t cached = __atomic_load_n(
        &((tsc_str_t*)s)->utf16_len_plus_one,
        __ATOMIC_RELAXED
    );
#else
    size_t cached = s->utf16_len_plus_one;
#endif
    if (cached != 0) return cached - 1;
    return string_utf16_sequence(s).len;
}

double tsc_str_length(const tsc_str_t* s) {
    return (double)tsc_str_utf16_length(s);
}

static bool string_nonnegative_integer_index(double value, size_t* out) {
    if (isnan(value)) value = 0.0;
    if (isinf(value)) return false;
    double integer = value < 0.0 ? ceil(value) : floor(value);
    if (integer < 0.0 || integer > (double)SIZE_MAX) return false;
    *out = (size_t)integer;
    return true;
}

static bool tsc_str_utf16_code_unit_at(
    const tsc_str_t* s,
    size_t target,
    uint16_t* out
) {
    tsc_utf16_sequence_t sequence = string_utf16_sequence(s);
    if (target >= sequence.len) return false;
    *out = sequence.data[target];
    return true;
}

static tsc_str_t* tsc_str_from_utf16_code_unit(uint16_t code_unit) {
    size_t width = utf8_len_for_code_point((uint32_t)code_unit);
    tsc_str_t* out = str_alloc(width);
    (void)write_utf8_code_point((char*)out->data, (uint32_t)code_unit);
    out->utf16_len_plus_one = 2;
    return out;
}

tsc_str_t* tsc_str_char_at(const tsc_str_t* s, double idx) {
    size_t target = 0;
    uint16_t code_unit = 0;
    if (!string_nonnegative_integer_index(idx, &target) ||
        !tsc_str_utf16_code_unit_at(s, target, &code_unit)) {
        return tsc_str_from_lit("", 0);
    }
    return tsc_str_from_utf16_code_unit(code_unit);
}

tsc_str_t* tsc_str_at(const tsc_str_t* s, double idx) {
    if (isnan(idx)) idx = 0.0;
    idx = idx < 0.0 ? ceil(idx) : floor(idx);
    double length = (double)tsc_str_utf16_length(s);
    if (idx < 0) idx = length + idx;
    if (isinf(idx) || idx < 0 || idx >= length) return NULL;
    return tsc_str_char_at(s, idx);
}

double tsc_str_char_code_at(const tsc_str_t* s, double idx) {
    size_t target = 0;
    uint16_t code_unit = 0;
    if (!string_nonnegative_integer_index(idx, &target) ||
        !tsc_str_utf16_code_unit_at(s, target, &code_unit)) return NAN;
    return (double)code_unit;
}

double tsc_str_code_point_at(const tsc_str_t* s, double idx) {
    size_t target = 0;
    if (!string_nonnegative_integer_index(idx, &target)) return NAN;
    tsc_utf16_sequence_t sequence = string_utf16_sequence(s);
    if (target >= sequence.len) return NAN;
    uint16_t first = sequence.data[target];
    if (is_high_surrogate(first)) {
        if (target + 1 < sequence.len && is_low_surrogate(sequence.data[target + 1])) {
            return (double)surrogate_pair_to_code_point(first, sequence.data[target + 1]);
        }
    }
    return (double)first;
}

bool tsc_str_is_well_formed(const tsc_str_t* string) {
    if (!string) return true;
    tsc_utf16_sequence_t sequence = string_utf16_sequence(string);
    for (size_t index = 0; index < sequence.len; index++) {
        uint16_t unit = sequence.data[index];
        if (is_high_surrogate(unit)) {
            if (index + 1 >= sequence.len ||
                !is_low_surrogate(sequence.data[index + 1])) return false;
            index++;
        } else if (is_low_surrogate(unit)) {
            return false;
        }
    }
    return true;
}

tsc_str_t* tsc_str_to_well_formed(const tsc_str_t* string) {
    if (!string) return tsc_str_from_lit("", 0);
    tsc_utf16_sequence_t sequence = string_utf16_sequence(string);
    bool changed = false;
    for (size_t index = 0; index < sequence.len; index++) {
        uint16_t unit = sequence.data[index];
        if (is_high_surrogate(unit)) {
            if (index + 1 < sequence.len &&
                is_low_surrogate(sequence.data[index + 1])) {
                index++;
            } else {
                changed = true;
            }
        } else if (is_low_surrogate(unit)) {
            changed = true;
        }
    }
    if (!changed) return (tsc_str_t*)string;
    uint16_t* repaired = (uint16_t*)TSC_GC_MALLOC_ATOMIC(
        sizeof(uint16_t) * (sequence.len ? sequence.len : 1)
    );
    memcpy(repaired, sequence.data, sequence.len * sizeof(uint16_t));
    for (size_t index = 0; index < sequence.len; index++) {
        if (is_high_surrogate(repaired[index])) {
            if (index + 1 < sequence.len && is_low_surrogate(repaired[index + 1])) {
                index++;
            } else {
                repaired[index] = 0xfffd;
            }
        } else if (is_low_surrogate(repaired[index])) {
            repaired[index] = 0xfffd;
        }
    }
    return string_from_utf16_range(repaired, 0, sequence.len);
}

int64_t string_clamped_position(double value, int64_t len) {
    if (isnan(value)) return 0;
    if (isinf(value)) return value < 0 ? 0 : len;
    double truncated = value < 0 ? ceil(value) : floor(value);
    if (truncated < 0) return 0;
    if (truncated > (double)len) return len;
    return (int64_t)truncated;
}

static bool utf16_sequence_matches(
    const tsc_utf16_sequence_t* haystack,
    size_t offset,
    const tsc_utf16_sequence_t* needle
) {
    if (offset > haystack->len || needle->len > haystack->len - offset) return false;
    return memcmp(
        haystack->data + offset,
        needle->data,
        needle->len * sizeof(uint16_t)
    ) == 0;
}

double tsc_str_index_of(const tsc_str_t* h, const tsc_str_t* n, double position) {
    tsc_utf16_sequence_t haystack = string_utf16_sequence(h);
    tsc_utf16_sequence_t needle = string_utf16_sequence(n);
    int64_t start_i = string_clamped_position(position, (int64_t)haystack.len);
    size_t start = (size_t)start_i;
    if (needle.len == 0) return (double)start;
    if (needle.len > haystack.len) return -1.0;
    for (size_t index = start; index <= haystack.len - needle.len; index++) {
        if (utf16_sequence_matches(&haystack, index, &needle)) return (double)index;
    }
    return -1.0;
}

double tsc_str_last_index_of(const tsc_str_t* h, const tsc_str_t* n, double position) {
    tsc_utf16_sequence_t haystack = string_utf16_sequence(h);
    tsc_utf16_sequence_t needle = string_utf16_sequence(n);
    int64_t pos_i = string_clamped_position(position, (int64_t)haystack.len);
    size_t pos = (size_t)pos_i;
    if (needle.len == 0) return (double)pos;
    if (needle.len > haystack.len) return -1.0;
    size_t max_start = haystack.len - needle.len;
    size_t index = (pos > max_start ? max_start : pos) + 1;
    while (index > 0) {
        index--;
        if (utf16_sequence_matches(&haystack, index, &needle)) return (double)index;
    }
    return -1.0;
}

bool tsc_str_includes(const tsc_str_t* h, const tsc_str_t* n, double position) {
    return tsc_str_index_of(h, n, position) >= 0;
}

bool tsc_str_starts_with(const tsc_str_t* s, const tsc_str_t* p, double position) {
    tsc_utf16_sequence_t string = string_utf16_sequence(s);
    tsc_utf16_sequence_t prefix = string_utf16_sequence(p);
    int64_t start_i = string_clamped_position(position, (int64_t)string.len);
    size_t start = (size_t)start_i;
    return utf16_sequence_matches(&string, start, &prefix);
}

bool tsc_str_ends_with(const tsc_str_t* s, const tsc_str_t* p, double end_position) {
    tsc_utf16_sequence_t string = string_utf16_sequence(s);
    tsc_utf16_sequence_t suffix = string_utf16_sequence(p);
    int64_t end_i = string_clamped_position(end_position, (int64_t)string.len);
    size_t end = (size_t)end_i;
    if (suffix.len > end) return false;
    return utf16_sequence_matches(&string, end - suffix.len, &suffix);
}

static int64_t relative_string_index(double value, int64_t length) {
    if (isnan(value)) return 0;
    if (isinf(value)) return value < 0 ? 0 : length;
    double integer = value < 0 ? ceil(value) : floor(value);
    if (integer < 0) {
        double relative = (double)length + integer;
        return relative < 0 ? 0 : (int64_t)relative;
    }
    return integer > (double)length ? length : (int64_t)integer;
}

tsc_str_t* tsc_str_slice(const tsc_str_t* s, double start, double end) {
    tsc_utf16_sequence_t sequence = string_utf16_sequence(s);
    int64_t length = (int64_t)sequence.len;
    int64_t from = relative_string_index(start, length);
    int64_t to = relative_string_index(end, length);
    if (to < from) to = from;
    return string_from_utf16_range(
        sequence.data,
        (size_t)from,
        (size_t)(to - from)
    );
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
    tsc_utf16_sequence_t sequence = string_utf16_sequence(s);
    int64_t slen = (int64_t)sequence.len;
    int64_t i0 = substring_index(start, slen);
    int64_t i1 = substring_index(end, slen);
    if (i0 > i1) {
        int64_t t = i0;
        i0 = i1;
        i1 = t;
    }
    return string_from_utf16_range(
        sequence.data,
        (size_t)i0,
        (size_t)(i1 - i0)
    );
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
    tsc_utf16_sequence_t sequence = string_utf16_sequence(s);
    int64_t slen = (int64_t)sequence.len;
    int64_t i0 = substr_start_index(start, slen);
    int64_t n = substr_count(length, slen - i0);
    return string_from_utf16_range(sequence.data, (size_t)i0, (size_t)n);
}

static tsc_str_t* string_change_case(const tsc_str_t* s, bool to_upper) {
    tsc_utf16_sequence_t sequence = string_utf16_sequence(s);
    if (sequence.len > (size_t)INT32_MAX) {
        tsc_panic("String case conversion: input too large");
    }
    UErrorCode status = U_ZERO_ERROR;
    int32_t mapped_len = 0;
    if (to_upper) {
        mapped_len = u_strToUpper(
            NULL, 0, (const UChar*)sequence.data, (int32_t)sequence.len, "", &status
        );
    } else {
        mapped_len = u_strToLower(
            NULL, 0, (const UChar*)sequence.data, (int32_t)sequence.len, "", &status
        );
    }
    if (status != U_BUFFER_OVERFLOW_ERROR && U_FAILURE(status)) {
        tsc_panic("String case conversion: mapping sizing failed");
    }
    UChar* mapped =
        (UChar*)TSC_GC_MALLOC_ATOMIC(sizeof(UChar) * ((size_t)mapped_len + 1));
    status = U_ZERO_ERROR;
    if (to_upper) {
        mapped_len = u_strToUpper(
            mapped, mapped_len + 1, (const UChar*)sequence.data,
            (int32_t)sequence.len, "", &status
        );
    } else {
        mapped_len = u_strToLower(
            mapped, mapped_len + 1, (const UChar*)sequence.data,
            (int32_t)sequence.len, "", &status
        );
    }
    if (U_FAILURE(status)) {
        tsc_panic("String case conversion: mapping failed");
    }
    return string_from_utf16_range((const uint16_t*)mapped, 0, (size_t)mapped_len);
}

tsc_str_t* tsc_str_to_upper(const tsc_str_t* s) {
    return string_change_case(s, true);
}

tsc_str_t* tsc_str_to_lower(const tsc_str_t* s) {
    return string_change_case(s, false);
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
        tsc_throw_error(
            TSC_ERROR_RANGE,
            tsc_str_from_cstr("String.normalize: form must be NFC, NFD, NFKC, or NFKD")
        );
    }
    if (U_FAILURE(status) || !normalizer) {
        tsc_panic("String.normalize: ICU normalizer unavailable");
    }
    tsc_utf16_sequence_t sequence = string_utf16_sequence(s);
    if (sequence.len > (size_t)INT32_MAX) {
        tsc_panic("String.normalize: input too large");
    }

    int32_t norm_len = 0;
    status = U_ZERO_ERROR;
    norm_len = unorm2_normalize(
        normalizer, (const UChar*)sequence.data, (int32_t)sequence.len,
        NULL, 0, &status
    );
    if (status != U_BUFFER_OVERFLOW_ERROR && U_FAILURE(status)) {
        tsc_panic("String.normalize: normalization sizing failed");
    }

    UChar* nbuf = (UChar*)TSC_GC_MALLOC_ATOMIC(sizeof(UChar) * ((size_t)norm_len + 1));
    status = U_ZERO_ERROR;
    norm_len = unorm2_normalize(
        normalizer, (const UChar*)sequence.data, (int32_t)sequence.len,
        nbuf, norm_len + 1, &status
    );
    if (U_FAILURE(status)) {
        tsc_panic("String.normalize: normalization failed");
    }
    return string_from_utf16_range((const uint16_t*)nbuf, 0, (size_t)norm_len);
}

static bool is_trim_whitespace_unit(uint16_t unit) {
    return unit == 0x0009 ||
        unit == 0x000a ||
        unit == 0x000b ||
        unit == 0x000c ||
        unit == 0x000d ||
        unit == 0x0020 ||
        unit == 0x00a0 ||
        unit == 0x1680 ||
        (unit >= 0x2000 && unit <= 0x200a) ||
        unit == 0x2028 ||
        unit == 0x2029 ||
        unit == 0x202f ||
        unit == 0x205f ||
        unit == 0x3000 ||
        unit == 0xfeff;
}

tsc_str_t* tsc_str_trim(const tsc_str_t* s) {
    tsc_utf16_sequence_t sequence = string_utf16_sequence(s);
    size_t start = 0;
    while (start < sequence.len && is_trim_whitespace_unit(sequence.data[start])) start++;
    size_t end = sequence.len;
    while (end > start && is_trim_whitespace_unit(sequence.data[end - 1])) end--;
    return string_from_utf16_range(sequence.data, start, end - start);
}

tsc_str_t* tsc_str_trim_start(const tsc_str_t* s) {
    tsc_utf16_sequence_t sequence = string_utf16_sequence(s);
    size_t start = 0;
    while (start < sequence.len && is_trim_whitespace_unit(sequence.data[start])) start++;
    return string_from_utf16_range(sequence.data, start, sequence.len - start);
}

tsc_str_t* tsc_str_trim_end(const tsc_str_t* s) {
    tsc_utf16_sequence_t sequence = string_utf16_sequence(s);
    size_t end = sequence.len;
    while (end > 0 && is_trim_whitespace_unit(sequence.data[end - 1])) end--;
    return string_from_utf16_range(sequence.data, 0, end);
}

typedef enum {
    TSC_STRING_FILL_BEFORE,
    TSC_STRING_FILL_AFTER,
} tsc_string_fill_placement_t;

static tsc_str_t* string_fill_to_utf16_length(
    tsc_utf16_sequence_t base,
    tsc_utf16_sequence_t filler,
    size_t target_length,
    tsc_string_fill_placement_t placement
) {
    if (target_length < base.len || filler.len == 0) {
        tsc_panic("invalid canonical String fill worklist");
    }
    if (target_length > SIZE_MAX / sizeof(uint16_t)) {
        tsc_throw_error(
            TSC_ERROR_RANGE,
            tsc_str_from_lit("resulting String is too large", 29)
        );
    }

    size_t fill_length = target_length - base.len;
    uint16_t* output = (uint16_t*)TSC_GC_MALLOC_ATOMIC(
        sizeof(uint16_t) * (target_length ? target_length : 1)
    );
    size_t base_offset = placement == TSC_STRING_FILL_BEFORE ? fill_length : 0;
    size_t fill_offset = placement == TSC_STRING_FILL_BEFORE ? 0 : base.len;
    if (base.len > 0) {
        memcpy(
            output + base_offset,
            base.data,
            base.len * sizeof(uint16_t)
        );
    }
    for (size_t index = 0; index < fill_length; index++) {
        output[fill_offset + index] = filler.data[index % filler.len];
    }
    return string_from_utf16_range(output, 0, target_length);
}

tsc_str_t* tsc_str_repeat(const tsc_str_t* s, double n) {
    double count_number = isnan(n) || n == 0.0 ? 0.0 : trunc(n);
    if (count_number < 0.0 || isinf(count_number)) {
        tsc_throw_error(
            TSC_ERROR_RANGE,
            tsc_str_from_lit("String repeat count is out of range", 35)
        );
    }

    tsc_utf16_sequence_t sequence = string_utf16_sequence(s);
    if (count_number == 0.0 || sequence.len == 0) {
        return tsc_str_from_lit("", 0);
    }
    size_t maximum_count = (SIZE_MAX / sizeof(uint16_t)) / sequence.len;
    if (count_number > (double)maximum_count) {
        tsc_throw_error(
            TSC_ERROR_RANGE,
            tsc_str_from_lit("resulting String is too large", 29)
        );
    }
    size_t target_length = sequence.len * (size_t)count_number;
    tsc_utf16_sequence_t empty = { 0, NULL };
    return string_fill_to_utf16_length(
        empty,
        sequence,
        target_length,
        TSC_STRING_FILL_AFTER
    );
}

tsc_str_t* tsc_str_pad_start(const tsc_str_t* s, double target, const tsc_str_t* pad) {
    tsc_utf16_sequence_t string = string_utf16_sequence(s);
    tsc_utf16_sequence_t filler = string_utf16_sequence(pad);
    if (isnan(target) || target <= (double)string.len || filler.len == 0) {
        return (tsc_str_t*)s;
    }
    if (!isfinite(target) || target > (double)(SIZE_MAX / sizeof(uint16_t))) {
        tsc_panic("padded String is too large");
    }
    size_t target_length = (size_t)floor(target);
    return string_fill_to_utf16_length(
        string,
        filler,
        target_length,
        TSC_STRING_FILL_BEFORE
    );
}

tsc_str_t* tsc_str_pad_end(const tsc_str_t* s, double target, const tsc_str_t* pad) {
    tsc_utf16_sequence_t string = string_utf16_sequence(s);
    tsc_utf16_sequence_t filler = string_utf16_sequence(pad);
    if (isnan(target) || target <= (double)string.len || filler.len == 0) {
        return (tsc_str_t*)s;
    }
    if (!isfinite(target) || target > (double)(SIZE_MAX / sizeof(uint16_t))) {
        tsc_panic("padded String is too large");
    }
    size_t target_length = (size_t)floor(target);
    return string_fill_to_utf16_length(
        string,
        filler,
        target_length,
        TSC_STRING_FILL_AFTER
    );
}

typedef struct {
    uint16_t* data;
    size_t len;
    size_t cap;
} tsc_utf16_builder_t;

static void utf16_builder_init(tsc_utf16_builder_t* output, size_t initial_cap) {
    if (initial_cap < 8) initial_cap = 8;
    if (initial_cap > SIZE_MAX / sizeof(uint16_t)) {
        tsc_panic("replacement String is too large");
    }
    output->data = (uint16_t*)malloc(initial_cap * sizeof(uint16_t));
    if (!output->data) tsc_panic("replacement String allocation failed");
    output->len = 0;
    output->cap = initial_cap;
}

static void utf16_builder_reserve(tsc_utf16_builder_t* output, size_t needed) {
    if (needed <= output->cap) return;
    if (needed > SIZE_MAX / sizeof(uint16_t)) {
        tsc_panic("replacement String is too large");
    }
    size_t cap = output->cap;
    while (cap < needed) {
        if (cap > (SIZE_MAX / sizeof(uint16_t)) / 2) {
            cap = needed;
            break;
        }
        cap *= 2;
    }
    uint16_t* data = (uint16_t*)realloc(output->data, cap * sizeof(uint16_t));
    if (!data) tsc_panic("replacement String allocation failed");
    output->data = data;
    output->cap = cap;
}

static void utf16_builder_append(
    tsc_utf16_builder_t* output,
    const uint16_t* units,
    size_t count
) {
    if (count == 0) return;
    if (output->len > SIZE_MAX - count) {
        tsc_panic("replacement String is too large");
    }
    size_t next_length = output->len + count;
    utf16_builder_reserve(output, next_length);
    memcpy(
        output->data + output->len,
        units,
        count * sizeof(uint16_t)
    );
    output->len = next_length;
}

static void utf16_builder_append_unit(tsc_utf16_builder_t* output, uint16_t unit) {
    if (output->len == SIZE_MAX) tsc_panic("replacement String is too large");
    utf16_builder_reserve(output, output->len + 1);
    output->data[output->len++] = unit;
}

static void append_string_substitution(
    tsc_utf16_builder_t* output,
    const tsc_utf16_sequence_t* source,
    const tsc_utf16_sequence_t* replacement,
    size_t match_start,
    size_t match_end
) {
    for (size_t index = 0; index < replacement->len; index++) {
        uint16_t unit = replacement->data[index];
        if (unit != '$' || index + 1 >= replacement->len) {
            utf16_builder_append_unit(output, unit);
            continue;
        }
        uint16_t next = replacement->data[++index];
        if (next == '$') {
            utf16_builder_append_unit(output, '$');
        } else if (next == '&') {
            utf16_builder_append(
                output,
                source->data + match_start,
                match_end - match_start
            );
        } else if (next == '`') {
            utf16_builder_append(output, source->data, match_start);
        } else if (next == '\'') {
            utf16_builder_append(
                output,
                source->data + match_end,
                source->len - match_end
            );
        } else {
            utf16_builder_append_unit(output, '$');
            utf16_builder_append_unit(output, next);
        }
    }
}

static bool find_utf16_sequence(
    const tsc_utf16_sequence_t* source,
    const tsc_utf16_sequence_t* search,
    size_t from,
    size_t* found
) {
    if (search->len > source->len || from > source->len - search->len) return false;
    for (size_t index = from; index <= source->len - search->len; index++) {
        if (utf16_sequence_matches(source, index, search)) {
            *found = index;
            return true;
        }
    }
    return false;
}

static tsc_str_t* string_replace_sequence(
    const tsc_str_t* string,
    const tsc_str_t* search_string,
    const tsc_str_t* replacement_string,
    bool replace_all
) {
    tsc_utf16_sequence_t source = string_utf16_sequence(string);
    tsc_utf16_sequence_t search = string_utf16_sequence(search_string);
    tsc_utf16_sequence_t replacement = string_utf16_sequence(replacement_string);
    size_t first_match = 0;
    if (search.len != 0 && !find_utf16_sequence(&source, &search, 0, &first_match)) {
        return (tsc_str_t*)string;
    }
    tsc_utf16_builder_t output;
    utf16_builder_init(&output, source.len);
    bool matched = false;
    size_t copy_from = 0;

    if (search.len == 0) {
        for (size_t boundary = 0; boundary <= source.len; boundary++) {
            utf16_builder_append(&output, source.data + copy_from, boundary - copy_from);
            append_string_substitution(&output, &source, &replacement, boundary, boundary);
            copy_from = boundary;
            matched = true;
            if (!replace_all) break;
        }
    } else {
        size_t match_start = first_match;
        while (true) {
            utf16_builder_append(
                &output,
                source.data + copy_from,
                match_start - copy_from
            );
            size_t match_end = match_start + search.len;
            append_string_substitution(
                &output,
                &source,
                &replacement,
                match_start,
                match_end
            );
            copy_from = match_end;
            matched = true;
            if (!replace_all) break;
            if (!find_utf16_sequence(&source, &search, match_end, &match_start)) break;
        }
    }

    if (!matched) {
        free(output.data);
        return (tsc_str_t*)string;
    }
    utf16_builder_append(&output, source.data + copy_from, source.len - copy_from);
    tsc_str_t* result = string_from_utf16_range(output.data, 0, output.len);
    free(output.data);
    return result;
}

tsc_str_t* tsc_str_replace(const tsc_str_t* s, const tsc_str_t* search, const tsc_str_t* repl) {
    return string_replace_sequence(s, search, repl, false);
}

tsc_str_t* tsc_str_replace_all(const tsc_str_t* s, const tsc_str_t* search, const tsc_str_t* repl) {
    return string_replace_sequence(s, search, repl, true);
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
    tsc_utf16_sequence_t source = string_utf16_sequence(s);
    tsc_utf16_sequence_t separator = string_utf16_sequence(sep);
    if (separator.len == 0) {
        for (size_t index = 0; index < source.len && a->len < limit; index++) {
            tsc_str_t* c = string_from_utf16_range(source.data, index, 1);
            tsc_array_push_raw(a, &c);
        }
        return a;
    }
    size_t start = 0;
    while (start <= source.len && a->len < limit) {
        size_t found = 0;
        bool matched = find_utf16_sequence(&source, &separator, start, &found);
        if (!matched) found = source.len;
        tsc_str_t* part = string_from_utf16_range(
            source.data,
            start,
            found - start
        );
        tsc_array_push_raw(a, &part);
        if (!matched) break;
        start = found + separator.len;
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
    tsc_utf16_sequence_t sequence = string_utf16_sequence(s);
    tsc_array_t* a = tsc_array_new(
        sizeof(tsc_str_t*),
        sequence.len ? sequence.len : 1
    );
    for (size_t index = 0; index < sequence.len; index++) {
        size_t width = 1;
        if (is_high_surrogate(sequence.data[index]) && index + 1 < sequence.len &&
            is_low_surrogate(sequence.data[index + 1])) {
            width = 2;
        }
        tsc_str_t* ch = string_from_utf16_range(sequence.data, index, width);
        tsc_array_push_raw(a, &ch);
        index += width - 1;
    }
    return a;
}

tsc_array_t* tsc_str_code_units(const tsc_str_t* s) {
    tsc_utf16_sequence_t sequence = string_utf16_sequence(s);
    tsc_array_t* out = tsc_array_new(
        sizeof(tsc_str_t*),
        sequence.len ? sequence.len : 1
    );
    for (size_t index = 0; index < sequence.len; index++) {
        tsc_str_t* unit = tsc_str_from_utf16_code_unit(sequence.data[index]);
        tsc_array_push_raw(out, &unit);
    }
    return out;
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
    s->symbol_key = NULL;
    s->utf16_len_plus_one = 0;
    s->utf16_cache = NULL;
    return s;
}
static bool is_uri_always_unescaped(unsigned char code_unit) {
    if ((code_unit >= 'A' && code_unit <= 'Z') ||
        (code_unit >= 'a' && code_unit <= 'z') ||
        (code_unit >= '0' && code_unit <= '9')) {
        return true;
    }
    switch (code_unit) {
        case '-': case '_': case '.': case '!': case '~':
        case '*': case '\'': case '(': case ')':
            return true;
        default:
            return false;
    }
}

static bool is_uri_reserved(unsigned char code_unit) {
    switch (code_unit) {
        case ';': case '/': case '?': case ':': case '@': case '&':
        case '=': case '+': case '$': case ',': case '#':
            return true;
        default:
            return false;
    }
}

static _Noreturn void throw_uri_malformed(void) {
    tsc_throw_error(TSC_ERROR_URI, tsc_str_from_lit("URI malformed", 13));
}

static void append_percent_octet(char* output, size_t* output_length, unsigned char octet) {
    static const char hexadecimal[] = "0123456789ABCDEF";
    output[(*output_length)++] = '%';
    output[(*output_length)++] = hexadecimal[octet >> 4];
    output[(*output_length)++] = hexadecimal[octet & 0x0f];
}

static tsc_str_t* tsc_encode_uri_impl(const tsc_str_t* string, bool component) {
    if (!string) string = tsc_str_from_lit("", 0);
    if (string->len > (SIZE_MAX - 1) / 3) tsc_panic("URI encoding output is too large");
    size_t output_capacity = string->len * 3 + 1;
    char* output = (char*)TSC_GC_MALLOC_ATOMIC(output_capacity);
    size_t output_length = 0;
    size_t offset = 0;

    while (offset < string->len) {
        unsigned char first = (unsigned char)string->data[offset];
        if (first <= 0x7f) {
            if (is_uri_always_unescaped(first) || (!component && is_uri_reserved(first))) {
                output[output_length++] = (char)first;
            } else {
                append_percent_octet(output, &output_length, first);
            }
            offset++;
            continue;
        }

        uint32_t code_point = 0;
        size_t width = 0;
        if (!decode_wtf8_at_strict(string, offset, &code_point, &width) ||
            (code_point >= 0xd800 && code_point <= 0xdfff)) {
            throw_uri_malformed();
        }
        for (size_t index = 0; index < width; index++) {
            append_percent_octet(
                output,
                &output_length,
                (unsigned char)string->data[offset + index]
            );
        }
        offset += width;
    }

    output[output_length] = '\0';
    return tsc_str_from_lit(output, output_length);
}

tsc_str_t* tsc_str_encode_uri(const tsc_str_t* string) {
    return tsc_encode_uri_impl(string, false);
}

tsc_str_t* tsc_str_encode_uri_component(const tsc_str_t* string) {
    return tsc_encode_uri_impl(string, true);
}

static int uri_hex_value(unsigned char code_unit) {
    if (code_unit >= '0' && code_unit <= '9') return (int)(code_unit - '0');
    if (code_unit >= 'a' && code_unit <= 'f') return (int)(code_unit - 'a') + 10;
    if (code_unit >= 'A' && code_unit <= 'F') return (int)(code_unit - 'A') + 10;
    return -1;
}

static bool parse_uri_octet(const tsc_str_t* string, size_t offset, unsigned char* octet) {
    if (offset + 3 > string->len || string->data[offset] != '%') return false;
    int high = uri_hex_value((unsigned char)string->data[offset + 1]);
    int low = uri_hex_value((unsigned char)string->data[offset + 2]);
    if (high < 0 || low < 0) return false;
    *octet = (unsigned char)((high << 4) | low);
    return true;
}

static size_t leading_one_bits(unsigned char octet) {
    size_t count = 0;
    unsigned char mask = 0x80;
    while ((octet & mask) != 0) {
        count++;
        mask >>= 1;
    }
    return count;
}

static tsc_str_t* tsc_decode_uri_impl(const tsc_str_t* string, bool preserve_reserved) {
    if (!string) string = tsc_str_from_lit("", 0);
    char* output = (char*)TSC_GC_MALLOC_ATOMIC(string->len + 1);
    size_t output_length = 0;
    size_t offset = 0;

    while (offset < string->len) {
        if (string->data[offset] != '%') {
            output[output_length++] = string->data[offset++];
            continue;
        }

        size_t escape_start = offset;
        unsigned char octets[4] = { 0, 0, 0, 0 };
        if (!parse_uri_octet(string, offset, &octets[0])) throw_uri_malformed();
        offset += 3;

        size_t width = leading_one_bits(octets[0]);
        if (width == 0) {
            if (preserve_reserved && is_uri_reserved(octets[0])) {
                memcpy(output + output_length, string->data + escape_start, 3);
                output_length += 3;
            } else {
                output[output_length++] = (char)octets[0];
            }
            continue;
        }
        if (width == 1 || width > 4) throw_uri_malformed();

        for (size_t index = 1; index < width; index++) {
            if (!parse_uri_octet(string, offset, &octets[index])) throw_uri_malformed();
            offset += 3;
        }
        uint32_t code_point = 0;
        if (!decode_canonical_utf8(octets, width, false, &code_point)) {
            throw_uri_malformed();
        }
        (void)code_point;
        memcpy(output + output_length, octets, width);
        output_length += width;
    }

    output[output_length] = '\0';
    return tsc_str_from_lit(output, output_length);
}

tsc_str_t* tsc_str_decode_uri(const tsc_str_t* string) {
    return tsc_decode_uri_impl(string, true);
}

tsc_str_t* tsc_str_decode_uri_component(const tsc_str_t* string) {
    return tsc_decode_uri_impl(string, false);
}
