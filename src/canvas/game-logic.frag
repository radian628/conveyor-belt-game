#version 300 es

precision highp float;

uniform highp usampler2D in_tex;

in vec2 texcoord;

out uvec4 out_tex;

/*
GPU Shader State:
r channel:
    bits [0-2]: block type
        - 0=none
        - 1=conveyor belt
        - 2=grabber
        - 3=converter (add, sub, mul, div)
        - 4=input
        - 5=output
    bits [3-4]: directions
        - up, down, left, right 
    bits [5-7]: lengths of grabbers
        0 through 7

g channel:
    number stored in block type
        - for inputs, this is the number they produce
        - for outputs, this is the number they accept
        - for conveyor belts and grabbers, this is the
            number that is on them
*/


//COMMON_START

// data types
#define NONE 0u
#define CONVEYOR 1u
#define GRABBER 2u
#define CONVERTER 3u
#define INPUT 4u
#define OUTPUT 5u
#define WALL 6u
#define COMPLETE 7u

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
    return (bitfield >> (start - 1u)) 
        & ((1u << (end - start)) + ((1u << (end - start)) - 1u));
}

uint bitmask(uint start, uint end) {
    return ((1u << (end)) - 1u) - ((1u << (start - 1u)) - 1u);
}

void set_bits(inout uint o, uint bits, uint start, uint end) {
    o &= ~bitmask(start, end);
    o += bits << (start - 1u);
}

uvec4 getpixel(ivec2 offset) {
    return texture(in_tex, texcoord + vec2(offset) / vec2(textureSize(in_tex, 0)));
}


#define GETSET(gettername, settername, channel, start, end) \
uint gettername(uvec4 cell) { \
    return get_bits(cell.channel, start, end); \
} \
void settername(inout uvec4 cell, uint value) { \
    set_bits(cell.channel, value, start, end); \
}

//METAPROGRAMMING_START
// r channel
GETSET(g_type, s_type, r, 1u, 3u)
GETSET(g_direction, s_direction, r, 4u, 5u)
GETSET(g_grabber_length, s_grabber_length, r, 6u, 8u)
GETSET(g_operation, s_operation, r, 9u, 12u)

// g channel
GETSET(g_has_num, s_has_num, g, 1u, 1u)
GETSET(g_num, s_num, g, 2u, 16u)

// b channel
GETSET(g_score, s_score, b, 1u, 8u)
GETSET(g_required_score, s_required_score, b, 9u, 16u)

//METAPROGRAMMING_END

//COMMON_END


ivec2 get_unit_offset_from_dir(uint dir) {
    ivec2 offset = ivec2(0);
    switch (dir) {
    case UP:
        offset.y += 1;
        break;
    case DOWN:
        offset.y -= 1;
        break;
    case LEFT:
        offset.x -= 1;
        break;
    case RIGHT:
        offset.x += 1;
        break;
    }
    return offset;
}

ivec2 get_unit_offset(uvec4 pixel) {
    uint direction = g_direction(pixel);
    return get_unit_offset_from_dir(direction);
}

uint dir_cw(uint dir) {
    uint[4] cw_lut = uint[4](RIGHT, LEFT, UP, DOWN);
    return cw_lut[dir];
}

uint dir_ccw(uint dir) {
    uint[4] ccw_lut = uint[4](LEFT, RIGHT, DOWN, UP);
    return ccw_lut[dir];
}

bool is_valid_belt_pointing_towards(uint dir) {
    ivec2 offset = get_unit_offset_from_dir(dir);
    uvec4 pixel = getpixel(offset);
    return g_type(pixel) == CONVEYOR && dir_cw(dir_cw(g_direction(pixel))) == dir;
}
bool is_valid_belt_pointing_away(uint dir) {
    ivec2 offset = get_unit_offset_from_dir(dir);
    uvec4 pixel = getpixel(offset);
    return g_type(pixel) == CONVEYOR && g_direction(pixel) == dir;
}

void handle_converter(uvec4 s, inout uvec4 o) {
    uint op = g_operation(s);
    uint dir = g_direction(s);

    uint src_dir1 = dir_cw(dir);
    uint src_dir2 = dir_ccw(dir);

    bool dst_isvalid = is_valid_belt_pointing_away(dir);
    bool src1_isvalid = is_valid_belt_pointing_towards(src_dir1);
    bool src2_isvalid = is_valid_belt_pointing_towards(src_dir2);
    if (!dst_isvalid || !src1_isvalid || !src2_isvalid) return;

    ivec2 dst_offset = get_unit_offset(s);
    ivec2 src_offset1 = get_unit_offset_from_dir(src_dir1);
    ivec2 src_offset2 = get_unit_offset_from_dir(src_dir2);
    
    uvec4 src_pixel1 = getpixel(src_offset1);
    uvec4 src_pixel2 = getpixel(src_offset2);

    uint src_value1 = g_num(src_pixel1);
    uint src_value2 = g_num(src_pixel2);

    uint operation_result;

    switch (op) {
    case ADD:
        operation_result = src_value1 + src_value2;
        break;
    case SUB:
        operation_result = src_value1 - src_value2;
        break;
    case MUL:
        operation_result = src_value1 * src_value2;
        break;
    case DIV:
        operation_result = src_value1 / src_value2;
        break;
    }

    s_num(o, operation_result);
    s_has_num(o, ((g_has_num(src_pixel1) == 1u) && (g_has_num(src_pixel2) == 1u)) ? 1u : 0u);
}

void handle_output(uvec4 s, inout uvec4 o) {
    uint delta_score = 0u;
    
    for (uint dir = 0u; dir < 4u; dir++) {
        ivec2 offset = get_unit_offset_from_dir(dir);
        uvec4 pixel = getpixel(-offset);
        
        if (g_direction(pixel) != dir) {
            continue;
        }

        if (g_num(pixel) != g_num(s)) {
            continue;
        }

        delta_score++;
    }

    s_score(o, g_score(s) + delta_score);
}




void move_number (in uvec4 s, inout uvec4 o) {
    if (g_type(s) == INPUT) return;
    if (g_type(s) == CONVERTER) return;
    
    for (uint dir = 0u; dir < 4u; dir++) {
        ivec2 offset = get_unit_offset_from_dir(dir);
        uvec4 pixel = getpixel(-offset);
        
        if (g_direction(pixel) != dir || g_type(pixel) != CONVEYOR) {
            continue;
        }

        if (g_type(s) == OUTPUT) {
            if (g_num(s) == g_num(pixel)) {
                s_score(o, g_score(s) + 1u);
            }
        } else if (g_has_num(pixel) == 1u) {
            s_num(o, g_num(pixel));
            s_has_num(o, g_has_num(pixel));
        }
    }
}



void handle_grabber(in uvec4 s, inout uvec4 o) {
    ivec2 offset = get_unit_offset(s) * int(g_grabber_length(s));
    uvec4 pixel = getpixel(offset);
    
    if (g_has_num(pixel) == 1u) {
        s_num(o, g_num(pixel));
        s_has_num(o, g_has_num(pixel));
    }
}


void handle_conveyor(uvec4 s, inout uvec4 o) {
    ivec2 offset = get_unit_offset(s);
    uvec4 past = getpixel(-offset);

    switch (g_type(past)) {
    case INPUT:
    case CONVERTER:
    case GRABBER:
        s_num(o, g_num(past));
        s_has_num(o, g_has_num(past));
        break;
    }
}


void main() {
    uvec4 s = texture(in_tex, texcoord);

    //s.g += 2u;
    // s_num(s, g_num(s) + 1u);

    // out_tex = s;
    // return;

    // r channel
    uint type = g_type(s);
    uint direction = g_direction(s);
    uint grabber_length = g_grabber_length(s);

    // g channel
    uint num_val = g_num(s);


    uvec4 o = s;
    s_has_num(o, 0u);

    move_number(s, o);

    switch (type) {
    // case NONE:
    //     break;
    case CONVEYOR:
        handle_conveyor(s, o);
        break;
    case GRABBER:

        handle_grabber(s, o);
        break;

    case CONVERTER:
        handle_converter(s, o);
        break;

    case INPUT:
        s_has_num(o, 1u);
        break;

    case OUTPUT:
        s_has_num(o, 1u);
        if (g_score(s) > g_required_score(s)) {
            s_type(o, COMPLETE);
        }
        break;

    // case OUTPUT:
    //     handle_output(s, o);
    //     break;
    }

    out_tex = o;
}