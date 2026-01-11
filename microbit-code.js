// Code to flash to your micro:bit
// This needs to be uploaded using the MakeCode JavaScript editor

// Function to display LED pattern from a binary number
function show(pattern: number) {
    let bits = pattern.toString(2).padStart(25, '0');
    for (let y = 0; y < 5; y++) {
        for (let x = 0; x < 5; x++) {
            let index = y * 5 + x;
            if (bits[24 - index] === '1') {
                led.plot(x, y);
            } else {
                led.unplot(x, y);
            }
        }
    }
}

// Initial display - show a smiley face
show(0b0101000000001000010001011110);

// Listen for serial data
serial.onDataReceived(serial.delimiters(Delimiters.NewLine), function () {
    let data = serial.readUntil(serial.delimiters(Delimiters.NewLine));
    // Check if it's a show command
    if (data.indexOf("show(0b") >= 0) {
        // Extract the binary number
        let start = data.indexOf("0b") + 2;
        let end = data.indexOf(")", start);
        if (end > start) {
            let binaryStr = data.substr(start, end - start);
            let pattern = parseInt(binaryStr, 2);
            show(pattern);
        }
    }
})

// Handle button presses
input.onButtonPressed(Button.A, function () {
    serial.writeLine('{"button": "BTN1", "pressed": true}');
})

input.onButtonPressed(Button.B, function () {
    serial.writeLine('{"button": "BTN2", "pressed": true}');
})
