/*
 * @license
 * Getting Started with Web Serial Codelab (https://todo)
 * Copyright 2019 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License
 */
'use strict';

let port;
let reader;
let inputDone;
let outputDone;
let inputStream;
let outputStream;

let log;
let ledCBs;
let divLeftBut;
let divRightBut;
let butConnect;
let connectionStatus;

const GRID_HAPPY = [1,0,0,0,1,0,0,0,0,0,0,0,1,0,0,1,0,0,0,1,0,1,1,1,0];
const GRID_SAD =   [1,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,1,1,1,0,1,0,0,0,1];
const GRID_OFF =   [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
const GRID_HEART = [0,1,0,1,0,1,1,1,1,1,1,1,1,1,1,0,1,1,1,0,0,0,1,0,0];


document.addEventListener('DOMContentLoaded', () => {
  // Initialize DOM elements
  log = document.getElementById('log');
  ledCBs = document.querySelectorAll('input.led');
  divLeftBut = document.getElementById('leftBut');
  divRightBut = document.getElementById('rightBut');
  butConnect = document.getElementById('butConnect');
  connectionStatus = document.getElementById('connectionStatus');

  butConnect.addEventListener('click', clickConnect);

 // CODELAB: Add feature detection here.
const notSupported = document.getElementById('notSupported');
notSupported.classList.toggle('hidden', 'serial' in navigator);
initCheckboxes();
});


/**
 * @name connect
 * Opens a Web Serial connection to a micro:bit and sets up the input and
 * output stream.
 */
async function connect() {
  // CODELAB: Add code to request & open port here.
// - Request a port and open a connection.
port = await navigator.serial.requestPort();
// - Wait for the port to open.
await port.open({ baudRate: 9600 });

// CODELAB: Add code setup the output stream here.
const encoder = new TextEncoderStream();
outputDone = encoder.readable.pipeTo(port.writable);
outputStream = encoder.writable;

// CODELAB: Send CTRL-C and turn off echo on REPL
writeToStream('\x03', 'echo(false);');

// CODELAB: Add code to read the stream here.
let decoder = new TextDecoderStream();
inputDone = port.readable.pipeTo(decoder.writable);
inputStream = decoder.readable
  .pipeThrough(new TransformStream(new LineBreakTransformer()))
  .pipeThrough(new TransformStream(new JSONTransformer()));

reader = inputStream.getReader();
readLoop();

}


/**
 * @name disconnect
 * Closes the Web Serial connection.
 */
async function disconnect() {
  drawGrid(GRID_OFF);
  sendGrid();

// CODELAB: Close the input stream (reader).
if (reader) {
  await reader.cancel();
  await inputDone.catch(() => {});
  reader = null;
  inputDone = null;
}

// CODELAB: Close the output stream.
if (outputStream) {
  await outputStream.getWriter().close();
  await outputDone;
  outputStream = null;
  outputDone = null;
}

// CODELAB: Close the port.
await port.close();
port = null;

}


/**
 * @name clickConnect
 * Click handler for the connect/disconnect button.
 */
async function clickConnect() {
// CODELAB: Add disconnect code here.
if (port) {
  await disconnect();
  toggleUIConnected(false);
  return;
}

  // CODELAB: Add connect code here.
await connect();

// Wait a bit, then define a helper function for Espruino
setTimeout(() => {
  // Create displayPattern function that converts binary to string for show()
  writeToStream('function displayPattern(p){var b=p.toString(2);while(b.length<25)b="0"+b;var s="";for(var i=0;i<25;i++){s+=b[24-i];}show(s);}');
}, 100);

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

  toggleUIConnected(true);
}


/**
 * @name readLoop
 * Reads data from the input stream and displays it on screen.
 */
async function readLoop() {
 // CODELAB: Add read loop here.
while (true) {
  const { value, done } = await reader.read();
  if (value) {
    log.textContent += value + '\n';
    if (value.button) {
      buttonPushed(value);
    }
  }
  if (done) {
    console.log('[readLoop] DONE', done);
    reader.releaseLock();
    break;
  }
}

}


/**
 * @name sendGrid
 * Iterates over the checkboxes and generates the command to set the LEDs.
 */
function sendGrid() {
// CODELAB: Generate the grid
const arr = [];
ledCBs.forEach((cb) => {
  arr.push(cb.checked === true ? 1 : 0);
});
writeToStream(`displayPattern(0b${arr.reverse().join('')})`);

}


/**
 * @name writeToStream
 * Gets a writer from the output stream and send the lines to the micro:bit.
 * @param  {...string} lines lines to send to the micro:bit
 */
function writeToStream(...lines) {
// CODELAB: Write to output stream
const writer = outputStream.getWriter();
lines.forEach((line) => {
  console.log('[SEND]', line);
  writer.write(line + '\n');
});
writer.releaseLock();

}


/**
 * @name watchButton
 * Tells the micro:bit to print a string on the console on button press.
 * @param {String} btnId Button ID (either BTN1 or BTN2)
 */
function watchButton(btnId) {
 // CODELAB: Hook up the micro:bit buttons to print a string.
const cmd = `
  setWatch(function(e) {
    print('{"button": "${btnId}", "pressed": ' + e.state + '}');
  }, ${btnId}, {repeat:true, debounce:20, edge:"both"});
`;
writeToStream(cmd);

}


/**
 * @name LineBreakTransformer
 * TransformStream to parse the stream into lines.
 */
class LineBreakTransformer {
  constructor() {
    // A container for holding stream data until a new line.
    this.container = '';
  }

  transform(chunk, controller) {
 // CODELAB: Handle incoming chunk
this.container += chunk;
const lines = this.container.split('\r\n');
this.container = lines.pop();
lines.forEach(line => controller.enqueue(line));

  }

  flush(controller) {
// CODELAB: Flush the stream.
controller.enqueue(this.container);

  }
}


/**
 * @name JSONTransformer
 * TransformStream to parse the stream into a JSON object.
 */
class JSONTransformer {
  transform(chunk, controller) {
// CODELAB: Attempt to parse JSON content
try {
  controller.enqueue(JSON.parse(chunk));
} catch (e) {
  controller.enqueue(chunk);
}

  }
}


/**
 * @name buttonPushed
 * Event handler called when one of the micro:bit buttons is pushed.
 * @param {Object} butEvt
 */
function buttonPushed(butEvt) {
// CODELAB: micro:bit button press handler
if (butEvt.button === 'BTN1') {
  divLeftBut.classList.toggle('pressed', butEvt.pressed);
  if (butEvt.pressed) {
    drawGrid(GRID_HAPPY);
    sendGrid();
  }
  return;
}
if (butEvt.button === 'BTN2') {
  divRightBut.classList.toggle('pressed', butEvt.pressed);
  if (butEvt.pressed) {
    drawGrid(GRID_SAD);
    sendGrid();
  }
}

}


/**
 * The code below is mostly UI code and is provided to simplify the codelab.
 */

function initCheckboxes() {
  ledCBs.forEach((cb) => {
    cb.addEventListener('change', () => {
      sendGrid();
    });
  });
}

function drawGrid(grid) {
  if (grid) {
    grid.forEach((v, i) => {
      ledCBs[i].checked = !!v;
    });
  }
}

function toggleUIConnected(connected) {
  let lbl = 'Connect';
  if (connected) {
    lbl = 'Disconnect';
    connectionStatus.textContent = '✓ Connected to micro:bit';
    connectionStatus.style.color = 'green';
    connectionStatus.style.fontWeight = 'bold';
  } else {
    connectionStatus.textContent = 'Not connected';
    connectionStatus.style.color = 'red';
  }
  butConnect.textContent = lbl;
  ledCBs.forEach((cb) => {
    if (connected) {
      cb.removeAttribute('disabled');
      return;
    }
    cb.setAttribute('disabled', true);
  });
}
