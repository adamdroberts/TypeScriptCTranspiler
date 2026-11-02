/* Compile-time RegExp literal validator.
 *
 * The compiler links this entry point with the runtime's own pattern parser
 * (tsc_regexp.c), so a literal is an early SyntaxError exactly when the
 * runtime would reject it. Input on stdin is a sequence of records, each a
 * little-endian u32 unit count followed by that many little-endian UTF-16
 * units, alternating pattern then flags. Output is one byte per pattern/flags
 * pair: 'k' valid, 'f' invalid flags, 'p' invalid pattern. Malformed or
 * oversized input exits with status 2 and no further output, which the
 * compiler treats as a validation failure (fail closed). */
#include "tsc_internal.h"

#include <stdio.h>
#include <unistd.h>

/* Bounds keep a hostile or corrupt stream from forcing unbounded allocation;
 * a source file cannot contain a literal longer than this anyway. */
#define TSC_REGEXP_VALIDATE_MAX_UNITS ((uint32_t)1 << 26)

_Noreturn void tsc_alloc_failure(size_t n) {
    (void)n;
    _exit(2);
}

/* Returns 1 on a complete record, 0 on clean end of input before any byte,
 * -1 on a truncated or oversized record. */
static int read_exact(void* buffer, size_t length, bool allow_eof) {
    unsigned char* bytes = buffer;
    size_t done = 0;
    while (done < length) {
        size_t got = fread(bytes + done, 1, length - done, stdin);
        if (got == 0) return (allow_eof && done == 0 && feof(stdin)) ? 0 : -1;
        done += got;
    }
    return 1;
}

static int read_units(uint16_t** units, uint32_t* count, bool allow_eof) {
    unsigned char header[4];
    int status = read_exact(header, sizeof header, allow_eof);
    if (status <= 0) return status;
    uint32_t length = (uint32_t)header[0] | (uint32_t)header[1] << 8 |
        (uint32_t)header[2] << 16 | (uint32_t)header[3] << 24;
    if (length > TSC_REGEXP_VALIDATE_MAX_UNITS) return -1;
    uint16_t* data = malloc(length ? (size_t)length * sizeof(uint16_t) : 1);
    if (!data) return -1;
    unsigned char pair[2];
    for (uint32_t index = 0; index < length; index++) {
        if (read_exact(pair, sizeof pair, false) != 1) { free(data); return -1; }
        data[index] = (uint16_t)(pair[0] | pair[1] << 8);
    }
    *units = data;
    *count = length;
    return 1;
}

int main(void) {
    for (;;) {
        uint16_t* pattern = NULL;
        uint16_t* flags = NULL;
        uint32_t pattern_len = 0, flags_len = 0;
        int status = read_units(&pattern, &pattern_len, true);
        if (status == 0) break;
        if (status < 0 || read_units(&flags, &flags_len, false) != 1) return 2;
        tsc_re_flags_t options;
        tsc_re_error_t error;
        char verdict = 'k';
        if (tsc_re_parse_flags(flags, flags_len, &options) != TSC_RE_OK) verdict = 'f';
        else if (!tsc_re_compile(pattern, pattern_len, options, &error)) verdict = 'p';
        free(pattern);
        free(flags);
        if (fputc(verdict, stdout) == EOF) return 2;
    }
    return fflush(stdout) == 0 ? 0 : 2;
}
