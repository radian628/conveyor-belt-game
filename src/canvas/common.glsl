
//COMMON_START

// data types
#define NONE 0u
#define CONVEYOR 1u
#define GRABBER 2u
#define CONVERTER 3u
#define INPUT 4u
#define OUTPUT 5u

// direction
#define UP 0u
#define DOWN 1u
#define LEFT 2u
#define RIGHT 3u

// operation
#define ADD 0u
#define SUB 1u
#define MUL 2u
#define DIV 3u

uint get_bits(uint bitfield, uint start, uint end) {
    return (bitfield >> start) & ((2u << (end - start)) - 1u);
}

uint bitmask(uint start, uint end) {
    return ((1u << (end)) - 1u) - ((1u << (start - 1u)) - 1u);
}

void set_bits(out uint o, uint bits, uint start, uint end) {
    o &= ~bitmask(start, end);
    o += bits >> start;
}

uvec4 getpixel(ivec2 offset) {
    return texture(in_tex, texcoord + vec2(offset) / vec2(textureSize(in_tex, 0)));
}


#define GETSET(gettername, settername, channel, start, end) \
uint gettername(uvec4 cell) { \
    return get_bits(cell.channel, start, end); \
} \
void settername(out uvec4 cell, uint value) { \
    set_bits(cell.channel, value, start, end); \
}

//METAPROGRAMMING_START
// r channel
GETSET(g_type, s_type, r, 0u, 2u)
GETSET(g_direction, s_direction, r, 3u, 4u)
GETSET(g_grabber_length, s_grabber_length, r, 5u, 7u)
GETSET(g_operation, s_operation, r, 8u, 11u)

// g channel
GETSET(g_num, s_num, g, 0u, 30u)
GETSET(g_has_num, s_has_num, g, 31u, 31u)

// b channel
GETSET(g_score, s_score, b, 0u, 7u)
GETSET(g_required_score, s_required_score, b, 8u, 15u)

//METAPROGRAMMING_END

//COMMON_END