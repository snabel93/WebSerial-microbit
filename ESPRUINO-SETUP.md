# Web Serial micro:bit with Espruino Firmware

This project demonstrates Web Serial API communication with a BBC micro:bit running Espruino firmware.

## Important: Web Serial Requirements

The Web Serial API has strict security requirements:
- **Must be served over HTTPS or localhost (127.0.0.1)**
- Cannot be accessed via `file://` protocol
- The page must be viewed as a live website, for example: `http://127.0.0.1:8080`

To run locally, use a simple HTTP server:
```bash
python -m http.server 8080
# Then open http://127.0.0.1:8080 in Chrome or Edge
```

## Espruino Firmware Setup

This implementation works with micro:bit devices running **Espruino firmware**. The standard Google Codelab assumes default micro:bit firmware, but this version has been modified to work with Espruino.

## Key Changes Made to script.js

### 1. **Added Espruino show() Function Override**

The original codelab code tried to call Espruino's built-in `show()` function directly with a binary number, but Espruino's `show()` expects a specific format. Additionally, Espruino's `show()` function is read-only and cannot be overridden. The solution is to create a helper function:

```javascript
// Wait a bit, then define a helper function for Espruino
setTimeout(() => {
  // Create displayPattern function that converts binary to string for show()
  writeToStream('function displayPattern(p){var b=p.toString(2);while(b.length<25)b="0"+b;var s="";for(var i=0;i<25;i++){s+=b[24-i];}show(s);}');
}, 100);
```

**What this does:**
- Creates a new function called `displayPattern()` (instead of trying to override the read-only `show()`)
- Accepts a binary number (like `0b0111010001001000000010001`)
- Converts the binary number to a 25-character string of "0"s and "1"s
- Passes that string to Espruino's built-in `show()` function
- The bit ordering (`b[24-i]`) ensures the checkboxes map correctly to the LED positions

Then, update `sendGrid()` to call `displayPattern()` instead of `show()`:

```javascript
function sendGrid() {
  const arr = [];
  ledCBs.forEach((cb) => {
    arr.push(cb.checked === true ? 1 : 0);
  });
  writeToStream(`displayPattern(0b${arr.reverse().join('')})`);
}
```

### 2. **Added Timing Delays**

Added `setTimeout` delays to ensure the custom `show()` function is defined before trying to use it:

```javascript
// CODELAB: Reset the grid on connect here.
setTimeout(() => {
  drawGrid(GRID_HAPPY);
  sendGrid();
}, 300);

// CODELAB: Initialize micro:bit buttons.
setTimeout(() => {
  watchButton('BTN1');
  watchButton('BTN2');
}, 200);
```

**Why this is necessary:**
- The Espruino REPL needs time to process commands
- 100ms: Define the `displayPattern()` helper function
- 200ms: Set up button watchers
- 300ms: Send the initial happy face grid

## Configuration

### Baud Rate

The baud rate is set to **9600** (line 68 in script.js), which works with Espruino firmware:

```javascript
await port.open({ baudRate: 9600 });
```

## Summary

The main issue with the standard codelab code is that it sends commands like `show(0b0111010001001000000010001)` directly to Espruino, but Espruino's built-in `show()` function doesn't accept binary numbers in that format. Additionally, Espruino's `show()` is a read-only built-in function that cannot be overridden.

The solution:
1. Create a helper function `displayPattern()` that accepts binary numbers
2. Convert the binary number to a string format Espruino's `show()` understands
3. Add proper timing to ensure commands execute in the right order
4. Update `sendGrid()` to call `displayPattern()` instead of `show()`

This allows the browser checkboxes to correctly control the micro:bit LEDs, and the micro:bit buttons to send events back to the browser!

## Features

- ✅ Browser-based LED control via checkboxes
- ✅ micro:bit button events sent back to browser
- ✅ Happy/sad face display on button press
- ✅ Real-time bidirectional communication
- ✅ Works with Espruino firmware on micro:bit

## Browser Compatibility

- Chrome 89+
- Edge 89+
- Opera 76+

(Web Serial API is not supported in Firefox or Safari)
