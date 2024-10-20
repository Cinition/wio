const std = @import("std");
const builtin = @import("builtin");
pub const backend = switch (builtin.os.tag) {
    .windows => @import("win32.zig"),
    .macos => @import("cocoa.zig"),
    .linux, .openbsd, .netbsd, .freebsd, .dragonfly => @import("unix.zig"),
    else => if (builtin.target.isWasm()) @import("wasm.zig") else @compileError("unsupported platform"),
};

pub var allocator: std.mem.Allocator = undefined;
pub var init_options: InitOptions = undefined;

pub const logFn = if (@hasDecl(backend, "logFn")) backend.logFn else std.log.defaultLog;

pub const InitOptions = struct {
    joystick: bool = false,
    joystickCallback: ?*const fn (usize) void = null,
    opengl: bool = false,
};

/// Unless otherwise noted, all calls to wio functions must be made on the same thread.
pub fn init(ally: std.mem.Allocator, options: InitOptions) !void {
    allocator = ally;
    init_options = options;
    try backend.init(options);
}

/// All windows must be closed before deinit is called.
pub fn deinit() void {
    backend.deinit();
}

pub const RunOptions = struct {
    wait: bool = false,
};

/// Begins the main loop, which continues as long as `func` returns true.
///
/// This must be the final call on its thread, and there must be no uses of `defer` in the same scope
/// (depending on the platform, it may return immediately, never, or when the main loop exits).
pub fn run(func: fn () anyerror!bool, options: RunOptions) !void {
    return backend.run(func, options);
}

pub const Size = struct {
    width: u16,
    height: u16,

    pub fn multiply(self: Size, scale: f32) Size {
        const width: f32 = @floatFromInt(self.width);
        const height: f32 = @floatFromInt(self.height);
        return .{
            .width = @intFromFloat(width * scale),
            .height = @intFromFloat(height * scale),
        };
    }
};

pub const CreateWindowOptions = struct {
    title: []const u8 = "wio",
    size: Size = .{ .width = 640, .height = 480 },
    scale: f32 = 1,
    mode: WindowMode = .normal,
    cursor: Cursor = .arrow,
    cursor_mode: CursorMode = .normal,
};

pub fn createWindow(options: CreateWindowOptions) !Window {
    return .{ .backend = try backend.createWindow(options) };
}

pub const Window = struct {
    backend: @typeInfo(@typeInfo(@TypeOf(backend.createWindow)).@"fn".return_type.?).error_union.payload,

    pub fn destroy(self: *Window) void {
        self.backend.destroy();
    }

    pub fn messageBox(self: *Window, style: MessageBoxStyle, title: []const u8, message: []const u8) void {
        backend.messageBox(self.backend, style, title, message);
    }

    pub fn getEvent(self: *Window) ?Event {
        return self.backend.getEvent();
    }

    pub fn setTitle(self: *Window, title: []const u8) void {
        self.backend.setTitle(title);
    }

    pub fn setSize(self: *Window, size: Size) void {
        self.backend.setSize(size);
    }

    pub fn setMode(self: *Window, mode: WindowMode) void {
        self.backend.setMode(mode);
    }

    pub fn setCursor(self: *Window, cursor: Cursor) void {
        self.backend.setCursor(cursor);
    }

    pub fn setCursorMode(self: *Window, mode: CursorMode) void {
        self.backend.setCursorMode(mode);
    }

    pub fn createContext(self: *Window, options: CreateContextOptions) !void {
        std.debug.assert(init_options.opengl);
        return self.backend.createContext(options);
    }

    /// May be called on any thread.
    pub fn makeContextCurrent(self: *Window) void {
        self.backend.makeContextCurrent();
    }

    pub fn swapBuffers(self: *Window) void {
        self.backend.swapBuffers();
    }

    /// Must be called on the thread where the context is current.
    pub fn swapInterval(self: *Window, interval: i32) void {
        self.backend.swapInterval(interval);
    }
};

pub fn getJoysticks(ally: std.mem.Allocator) !JoystickList {
    std.debug.assert(init_options.joystick);
    return .{ .items = try backend.getJoysticks(ally), .allocator = ally };
}

pub const JoystickList = struct {
    items: []JoystickInfo,
    allocator: std.mem.Allocator,

    pub fn deinit(self: JoystickList) void {
        backend.freeJoysticks(self.allocator, self.items);
    }
};

pub const JoystickInfo = struct {
    handle: usize,
    id: []const u8,
    name: []const u8,
};

pub fn resolveJoystickId(id: []const u8) ?usize {
    std.debug.assert(init_options.joystick);
    return backend.resolveJoystickId(id);
}

pub fn openJoystick(handle: usize) !?Joystick {
    std.debug.assert(init_options.joystick);
    return .{
        .backend = backend.openJoystick(handle) catch |err| switch (err) {
            error.Unavailable => return null,
            else => return err,
        },
    };
}

pub const Joystick = struct {
    backend: @typeInfo(@typeInfo(@TypeOf(backend.openJoystick)).@"fn".return_type.?).error_union.payload,

    pub fn close(self: *Joystick) void {
        self.backend.close();
    }

    pub fn poll(self: *Joystick) !?JoystickState {
        return self.backend.poll();
    }
};

pub const JoystickState = struct {
    axes: []u16,
    hats: []Hat,
    buttons: []bool,
};

pub const Hat = packed struct {
    up: bool = false,
    right: bool = false,
    down: bool = false,
    left: bool = false,
};

pub const MessageBoxStyle = enum { info, warn, err };

pub fn messageBox(style: MessageBoxStyle, title: []const u8, message: []const u8) void {
    backend.messageBox(null, style, title, message);
}

pub fn setClipboardText(text: []const u8) void {
    backend.setClipboardText(text);
}

pub fn getClipboardText(ally: std.mem.Allocator) ?[]u8 {
    return backend.getClipboardText(ally);
}

pub fn glGetProcAddress(comptime name: [:0]const u8) ?*const fn () void {
    std.debug.assert(init_options.opengl);
    return @alignCast(@ptrCast(backend.glGetProcAddress(name)));
}

pub const Event = union(enum) {
    close: void,
    /// Sent on window creation, after `size`, `framebuffer`, and `scale`.
    create: void,
    focused: void,
    unfocused: void,
    draw: void,
    size: Size,
    framebuffer: Size,
    scale: f32,
    /// Sent before `size`.
    mode: WindowMode,
    char: u21,
    button_press: Button,
    button_release: Button,
    mouse: struct { x: u16, y: u16 },
    mouse_relative: struct { x: i16, y: i16 },
    scroll_vertical: f32,
    scroll_horizontal: f32,
};

pub const EventType = @typeInfo(Event).@"union".tag_type.?;

pub const WindowMode = enum {
    normal,
    maximized,
    fullscreen,
};

pub const Cursor = enum {
    arrow,
    arrow_busy,
    busy,
    text,
    hand,
    crosshair,
    forbidden,
    move,
    size_ns,
    size_ew,
    size_nesw,
    size_nwse,
};

pub const CursorMode = enum {
    normal,
    hidden,
    relative,
};

pub const CreateContextOptions = struct {
    doublebuffer: bool = true,
    red_bits: u8 = 8,
    green_bits: u8 = 8,
    blue_bits: u8 = 8,
    alpha_bits: u8 = 8,
    depth_bits: u8 = 24,
    stencil_bits: u8 = 8,
    samples: u8 = 0,
};

pub const Button = enum {
    mouse_left,
    mouse_right,
    mouse_middle,
    mouse_back,
    mouse_forward,
    a,
    b,
    c,
    d,
    e,
    f,
    g,
    h,
    i,
    j,
    k,
    l,
    m,
    n,
    o,
    p,
    q,
    r,
    s,
    t,
    u,
    v,
    w,
    x,
    y,
    z,
    @"1",
    @"2",
    @"3",
    @"4",
    @"5",
    @"6",
    @"7",
    @"8",
    @"9",
    @"0",
    enter,
    escape,
    backspace,
    tab,
    space,
    minus,
    equals,
    left_bracket,
    right_bracket,
    backslash,
    semicolon,
    apostrophe,
    grave,
    comma,
    dot,
    slash,
    caps_lock,
    f1,
    f2,
    f3,
    f4,
    f5,
    f6,
    f7,
    f8,
    f9,
    f10,
    f11,
    f12,
    print_screen,
    scroll_lock,
    pause,
    insert,
    home,
    page_up,
    delete,
    end,
    page_down,
    right,
    left,
    down,
    up,
    num_lock,
    kp_slash,
    kp_star,
    kp_minus,
    kp_plus,
    kp_enter,
    kp_1,
    kp_2,
    kp_3,
    kp_4,
    kp_5,
    kp_6,
    kp_7,
    kp_8,
    kp_9,
    kp_0,
    kp_dot,
    iso_backslash,
    application,
    kp_equals,
    f13,
    f14,
    f15,
    f16,
    f17,
    f18,
    f19,
    f20,
    f21,
    f22,
    f23,
    f24,
    kp_comma,
    international1,
    international2,
    international3,
    international4,
    international5,
    lang1,
    lang2,
    left_control,
    left_shift,
    left_alt,
    left_gui,
    right_control,
    right_shift,
    right_alt,
    right_gui,
};
