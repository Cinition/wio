const wio = {
    module: undefined,
    canvas: undefined,
    log: "",
    events: [],
    cursor: undefined,
    gamepads: undefined,
    gamepad_ids: undefined,
    gl: undefined,
    objects: [],

    run(module, canvas) {
        wio.module = module;
        wio.canvas = canvas;
        wio.gl = canvas.getContext("webgl");

        module.exports._start();
        requestAnimationFrame(wio.loop);

        canvas.style.width = `${canvas.width}px`;
        canvas.style.height = `${canvas.height}px`;
        canvas.width *= devicePixelRatio;
        canvas.height *= devicePixelRatio;

        wio.events.push(
            5, parseInt(canvas.style.width), parseInt(canvas.style.height),
            7, canvas.width, canvas.height,
            8, devicePixelRatio,
            1,
        );

        new ResizeObserver(() => wio.events.push(
            5, parseInt(canvas.style.width), parseInt(canvas.style.height),
            7, canvas.width, canvas.height,
            8, devicePixelRatio,
        )).observe(canvas);

        canvas.addEventListener("contextmenu", event => event.preventDefault());
        canvas.addEventListener("keydown", event => {
            event.preventDefault();
            const key = wio.keys[event.code];
            if (key) wio.events.push(event.repeat ? 11 : 10, key);
            if ([...event.key].length == 1) wio.events.push(9, event.key.codePointAt(0));
        });
        canvas.addEventListener("keyup", event => {
            const key = wio.keys[event.code];
            if (key) wio.events.push(12, key);
        });
        canvas.addEventListener("mousedown", event => {
            const button = wio.buttons[event.button];
            if (button != undefined) wio.events.push(10, button);
        });
        canvas.addEventListener("mouseup", event => {
            const button = wio.buttons[event.button];
            if (button != undefined) wio.events.push(12, button);
        });
        canvas.addEventListener("mousemove", event => {
            wio.events.push(13, event.offsetX, event.offsetY);
        });

        addEventListener("gamepadconnected", () => wio.events.push(16));
        addEventListener("gamepaddisconnected", () => wio.events.push(16));
    },

    loop() {
        if (wio.module.exports.wioLoop()) {
            requestAnimationFrame(wio.loop);
        }
    },

    write(ptr, len) {
        wio.log += wio.getString(ptr, len);
    },

    flush() {
        console.log(wio.log);
        wio.log = "";
    },

    shift() {
        return wio.events.shift();
    },

    shiftFloat() {
        return wio.events.shift();
    },

    setCursor(cursor) {
        wio.cursor = {
            0: "default",
            1: "progress",
            2: "wait",
            3: "text",
            4: "pointer",
            5: "crosshair",
            6: "not-allowed",
            7: "move",
            8: "ns-resize",
            9: "ew-resize",
            10: "nesw-resize",
            11: "nwse-resize",
        }[cursor];
        wio.canvas.style.cursor = wio.cursor;
    },

    setCursorMode(mode) {
        switch (mode) {
            case 0:
                wio.canvas.style.cursor = wio.cursor;
                break;
            case 1:
                wio.cursor = wio.canvas.style.cursor;
                wio.canvas.style.cursor = "none";
                break;
        }
    },

    getJoysticks() {
        wio.gamepads = navigator.getGamepads();
        wio.gamepad_ids = [];
        const encoder = new TextEncoder();
        for (let i = 0; i < wio.gamepads.length; i++) {
            if (wio.gamepads[i] != null) {
                wio.gamepad_ids[i] = encoder.encode(wio.gamepads[i].id);
            } else {
                wio.gamepad_ids[i] = { length: 0 };
            }
        }
        return wio.gamepads.length;
    },

    getJoystickIdLen(i) {
        return wio.gamepad_ids[i].length;
    },

    getJoystickId(i, ptr) {
        wio.setString(ptr, wio.gamepad_ids[i]);
    },

    openJoystick(i, ptr) {
        if (wio.gamepads[i] == null || !wio.gamepads[i].connected) return false;
        const lengths = new Uint32Array(wio.module.exports.memory.buffer, ptr, 2);
        lengths[0] = wio.gamepads[i].axes.length;
        lengths[1] = wio.gamepads[i].buttons.length;
        return true;
    },

    getJoystickState(index, axes_ptr, axes_len, buttons_ptr, buttons_len) {
        if (wio.gamepads[index] == null || !wio.gamepads[index].connected) return false;
        const axes = new Uint16Array(wio.module.exports.memory.buffer, axes_ptr, axes_len);
        const buttons = new Uint8Array(wio.module.exports.memory.buffer, buttons_ptr, buttons_len);
        for (let i = 0; i < axes_len; i++) {
            axes[i] = (wio.gamepads[index].axes[i] + 1) * 32767.5;
        }
        for (let i = 0; i < buttons_len; i++) {
            buttons[i] = wio.gamepads[index].buttons[i].pressed;
        }
        return true;
    },

    messageBox(ptr, len) {
        alert(wio.getString(ptr, len));
    },

    setClipboardText(ptr, len) {
        navigator.clipboard.writeText(wio.getString(ptr, len));
    },

    getString(ptr, len) {
        return new TextDecoder().decode(new Uint8Array(wio.module.exports.memory.buffer, ptr, len));
    },

    setString(ptr, buffer) {
        if (buffer.length == 0) return;
        const output = new Uint8Array(wio.module.exports.memory.buffer, ptr, buffer.length);
        for (let i = 0; i < buffer.length; i++) {
            output[i] = buffer[i];
        }
    },

    keys: {
        KeyA: 5,
        KeyB: 6,
        KeyC: 7,
        KeyD: 8,
        KeyE: 9,
        KeyF: 10,
        KeyG: 11,
        KeyH: 12,
        KeyI: 13,
        KeyJ: 14,
        KeyK: 15,
        KeyL: 16,
        KeyM: 17,
        KeyN: 18,
        KeyO: 19,
        KeyP: 20,
        KeyQ: 21,
        KeyR: 22,
        KeyS: 23,
        KeyT: 24,
        KeyU: 25,
        KeyV: 26,
        KeyW: 27,
        KeyX: 28,
        KeyY: 29,
        KeyZ: 30,
        Digit1: 31,
        Digit2: 32,
        Digit3: 33,
        Digit4: 34,
        Digit5: 35,
        Digit6: 36,
        Digit7: 37,
        Digit8: 38,
        Digit9: 39,
        Digit0: 40,
        Enter: 41,
        Escape: 42,
        Backspace: 43,
        Tab: 44,
        Space: 45,
        Minus: 46,
        Equal: 47,
        BracketLeft: 48,
        BracketRight: 49,
        Backslash: 50,
        Semicolon: 51,
        Quote: 52,
        Backquote: 53,
        Comma: 54,
        Period: 55,
        Slash: 56,
        CapsLock: 57,
        F1: 58,
        F2: 59,
        F3: 60,
        F4: 61,
        F5: 62,
        F6: 63,
        F7: 64,
        F8: 65,
        F9: 66,
        F10: 67,
        F11: 68,
        F12: 69,
        PrintScreen: 70,
        ScrollLock: 71,
        Pause: 72,
        Insert: 73,
        Home: 74,
        PageUp: 75,
        Delete: 76,
        End: 77,
        PageDown: 78,
        ArrowRight: 79,
        ArrowLeft: 80,
        ArrowDown: 81,
        ArrowUp: 82,
        NumLock: 83,
        NumpadDivide: 84,
        NumpadMultiply: 85,
        NumpadSubtract: 86,
        NumpadAdd: 87,
        NumpadEnter: 88,
        Numpad1: 89,
        Numpad2: 90,
        Numpad3: 91,
        Numpad4: 92,
        Numpad5: 93,
        Numpad6: 94,
        Numpad7: 95,
        Numpad8: 96,
        Numpad9: 97,
        Numpad0: 98,
        NumpadDecimal: 99,
        IntlBackslash: 100,
        ContextMenu: 101,
        NumpadEqual: 102,
        F13: 103,
        F14: 104,
        F15: 105,
        F16: 106,
        F17: 107,
        F18: 108,
        F19: 109,
        F20: 110,
        F21: 111,
        F22: 112,
        F23: 113,
        F24: 114,
        NumpadComma: 115,
        IntlRo: 116,
        KanaMode: 117,
        IntlYen: 118,
        Convert: 119,
        NonConvert: 120,
        Lang1: 121,
        Lang2: 122,
        ControlLeft: 123,
        ShiftLeft: 124,
        AltLeft: 125,
        MetaLeft: 126,
        ControlRight: 127,
        ShiftRight: 128,
        AltRight: 129,
        MetaRight: 130,
    },

    buttons: {
        0: 0,
        1: 2,
        2: 1,
        3: 3,
        4: 4,
    },

    getStringZ(ptr) {
        const array = new Uint8Array(wio.module.exports.memory.buffer, ptr);
        let len = 0;
        while (array[len]) len++;
        return wio.getString(ptr, len);
    },

    glAttachShader(program, shader) {
        wio.gl.attachShader(wio.objects[program], wio.objects[shader]);
    },

    glBindBuffer(target, buffer) {
        wio.gl.bindBuffer(target, wio.objects[buffer]);
    },

    glBufferData(target, size, ptr, usage) {
        wio.gl.bufferData(target, new Uint8Array(wio.module.exports.memory.buffer, ptr, size), usage);
    },

    glClear(mask) {
        wio.gl.clear(mask);
    },

    glClearColor(red, green, blue, alpha) {
        wio.gl.clearColor(red, green, blue, alpha);
    },

    glCompileShader(shader) {
        wio.gl.compileShader(wio.objects[shader]);
    },

    glCreateProgram() {
        const program = wio.gl.createProgram();
        return wio.objects.push(program) - 1;
    },

    glCreateShader(type) {
        const shader = wio.gl.createShader(type);
        return wio.objects.push(shader) - 1;
    },

    glDrawArrays(mode, first, count) {
        wio.gl.drawArrays(mode, first, count);
    },

    glEnableVertexAttribArray(index) {
        wio.gl.enableVertexAttribArray(index);
    },

    glGenBuffers(n, ptr) {
        const buffers = new Uint32Array(wio.module.exports.memory.buffer, ptr, n);
        for (let i = 0; i < n; i++) {
            buffers[i] = wio.objects.push(wio.gl.createBuffer()) - 1;
        }
    },

    glGetAttribLocation(index, name) {
        return wio.gl.getAttribLocation(wio.objects[index], wio.getStringZ(name));
    },

    glLinkProgram(program) {
        wio.gl.linkProgram(wio.objects[program]);
    },

    glShaderSource(shader, count, strings_ptr, lengths_ptr) {
        const strings = new Uint32Array(wio.module.exports.memory.buffer, strings_ptr, count);
        const lengths = new Int32Array(wio.module.exports.memory.buffer, lengths_ptr, count);
        var string = "";
        for (let i = 0; i < count; i++) {
            string += (lengths_ptr != 0 && lengths[i] >= 0) ? wio.getString(strings[i], lengths[i]) : wio.getStringZ(strings[i]);
        }
        wio.gl.shaderSource(wio.objects[shader], string);
    },

    glUseProgram(program) {
        wio.gl.useProgram(wio.objects[program]);
    },

    glVertexAttribPointer(index, size, type, normalized, stride, offset) {
        wio.gl.vertexAttribPointer(index, size, type, normalized, stride, offset);
    },

    glViewport(x, y, width, height) {
        wio.gl.viewport(x, y, width, height);
    },
};
