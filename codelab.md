1. Introduction
Last Updated: 2020-07-21

What you'll build
In this codelab, you'll build a web page that uses the Web Serial API to interact with a BBC micro:bit board to show images on its 5x5 LED matrix. You'll learn about the Web Serial API and how to use readable, writeable, and transform streams to communicate with serial devices through the browser.

81167ab7c01d353d.png

What you'll learn
How to open and close a Web Serial port
How to use a read loop to handle data from an input stream
How to send data out via a write stream
What you'll need
A BBC micro:bit board with the latest Espruino firmware
A recent version of Chrome (80 or later)
Knowledge of HTML, CSS, JavaScript, and Chrome DevTools
We chose to use the micro:bit for this codelab because it is affordable, offers a few inputs (buttons) and outputs (5x5 LED display), and can provide additional inputs and outputs. See the BBC micro:bit page on the Espruino site for details on what the micro:bit is capable of.

2. About the Web Serial API
The Web Serial API provides a way for websites to read from and write to a serial device with scripts. The API bridges the web and the physical world by allowing websites to communicate with serial devices, such as microcontrollers and 3D printers.

There are many examples of control software being built using web technology. For example:

Arduino Create
Betaflight Configurator
Espruino IDE
MakeCode
In some cases, these websites communicate with the device through a native agent application that is manually installed by the user. In other cases, the application is delivered in a packaged native application through a framework such as Electron. In other cases, the user is required to perform an additional step, such as copying a compiled application to the device with a USB flash drive.

The user experience can be improved by providing direct communication between the site and the device that it is controlling.

3. Getting set up
Get the code
We've put everything you need for this codelab into a Glitch project.

Open a new browser tab and go to https://web-serial-codelab-start.glitch.me/.
Click the Remix Glitch link to create your own version of the starter project.
Click the Show button, and then choose In a New Window to see your code in action.

4. Open a serial connection
Check whether the Web Serial API is supported
The first thing to do is to check whether the Web Serial API is supported in the current browser. To do that, check whether serial is in navigator.

In the DOMContentLoaded event, add the following code to your project:

script.js - DOMContentLoaded


// CODELAB: Add feature detection here.
const notSupported = document.getElementById('notSupported');
notSupported.classList.toggle('hidden', 'serial' in navigator);
This checks whether Web Serial is supported. If it is, this code hides the banner that says that Web Serial is not supported.

Try it
Load the page.
Verify that the page does not show a red banner stating that Web Serial is not supported.
Open the serial port
Next, we need to open the serial port. Like most other modern APIs, the Web Serial API is asynchronous. This prevents the UI from blocking when awaiting input, but it's also important because serial data may be received by the web page at any time, and we need a way to listen for it.

Because a computer may have multiple serial devices, when the browser tries to request a port, it prompts the user to pick which device to connect with.

Add the following code to your project:

script.js - connect()


// CODELAB: Add code to request & open port here.
// - Request a port and open a connection.
port = await navigator.serial.requestPort();
// - Wait for the port to open.
await port.open({ baudrate: 9600 });
The requestPort call prompts the user for which device they want to connect to. Calling port.open opens the port. We also need to provide the speed at which we want to communicate with the serial device. The BBC micro:bit uses a 9600 baud connection between the USB-to-serial chip and the main processor.

Let's also hook up the connect button and have it call connect() when the user clicks it.

Add the following code to your project:

script.js - clickConnect()


// CODELAB: Add connect code here.
await connect();
Try it
Our project now has the bare minimum to get started. Clicking the Connect button prompts the user to select the serial device to connect to and then connects to the micro:bit.

Reload the page.
Click the Connect button.
In the Serial Port chooser dialog, select the BBC micro:bit device and click Connect.
On the tab, you should see an icon indicating that you've connected to a serial device:
d9d0d3966960aeab.png

Tip: If the micro:bit does not appear in the chooser, try resetting the device by pushing the reset button next to the USB port on the back.

Set up an input stream to listen for data from the serial port
After the connection has been established, we need to set up an input stream and a reader to read the data from the device. First, we'll get the readable stream from the port by calling port.readable. Since we know that we'll be getting text back from the device, we'll pipe it through a text decoder. Next, we'll get a reader and start the read loop.

Add the following code to your project:

script.js - connect()


// CODELAB: Add code to read the stream here.
let decoder = new TextDecoderStream();
inputDone = port.readable.pipeTo(decoder.writable);
inputStream = decoder.readable;

reader = inputStream.getReader();
readLoop();
The read loop is an asynchronous function that runs in a loop and waits for content without blocking the main thread. When new data arrives, the reader returns two properties: the value and a done boolean. If done is true, the port has been closed or there is no more data coming in.

Add the following code to your project:

script.js - readLoop()


// CODELAB: Add read loop here.
while (true) {
  const { value, done } = await reader.read();
  if (value) {
    log.textContent += value + '\n';
  }
  if (done) {
    console.log('[readLoop] DONE', done);
    reader.releaseLock();
    break;
  }
}
Try it
Our project can now connect to the device and will append any data received from the device to the log element.

Reload the page.
Click the Connect button.
In the Serial Port chooser dialog, select the BBC micro:bit device and click Connect.
You should see the Espruino logo:
93494fd58ea835eb.png

Tip: This might be corrupted on Chrome OS and Linux because there is a system service that tries to talk to the device because the OS thinks that the device is a modem. You can ignore this corruption, but it might look weird. This is one reason that it's important to send Ctrl-C as the first thing.

Set up an output stream to send data to the serial port
Serial communication is typically bidirectional. In addition to receiving data from the serial port, we also want to send data to the port. As with the input stream, we'll only be sending text over the output stream to the micro:bit.

First, create a text encoder stream and pipe the stream to port.writeable.

script.js - connect()


// CODELAB: Add code setup the output stream here.
const encoder = new TextEncoderStream();
outputDone = encoder.readable.pipeTo(port.writable);
outputStream = encoder.writable;
When connected via serial with the Espruino firmware, the BBC micro:bit board acts as JavaScript read-eval-print loop (REPL), similar to what you get in a Node.js shell. Next, we need to provide a method to send data to the stream. The code below gets a writer from the output stream and then uses write to send each line. Each line that is sent includes a new-line character (\n), to tell the micro:bit to evaluate the command sent.

script.js - writeToStream()


// CODELAB: Write to output stream
const writer = outputStream.getWriter();
lines.forEach((line) => {
  console.log('[SEND]', line);
  writer.write(line + '\n');
});
writer.releaseLock();
To put the system into a known state and stop it from echoing back the characters that we send it, we need to send a CTRL-C and turn off the echo.

script.js - connect()


// CODELAB: Send CTRL-C and turn off echo on REPL
writeToStream('\x03', 'echo(false);');
Try it
Our project can now send and receive data from the micro:bit. Let's verify that we can properly send a command:

Reload the page.
Click the Connect button.
In the Serial Port chooser dialog, select the BBC micro:bit device and click Connect.
Open the Console tab in Chrome DevTools, and type writeToStream('console.log("yes")');
You should see something like this printed on the page:

5. Control the LED matrix
Build the matrix grid string
To control the LED matrix on the micro:bit, we need to call show(). This method shows graphics on the built-in 5x5 LED screen. This takes a binary number or a string.

We'll iterate over the checkboxes and generate an array of 1s and 0s indicating which is checked and which isn't. We then need to reverse the array, because the order of our checkboxes is the opposite of the order of the LEDs in the matrix. Next, we convert the array to a string and create the command to send to the micro:bit.

script.js - sendGrid()


// CODELAB: Generate the grid
const arr = [];
ledCBs.forEach((cb) => {
  arr.push(cb.checked === true ? 1 : 0);
});
writeToStream(`show(0b${arr.reverse().join('')})`);
Hook up the checkboxes to update the matrix
Next, we need to listen for changes on the checkboxes and, if they change, send that information to the micro:bit. In the feature detection code (// CODELAB: Add feature detection here.), add the following line:

script.js - DOMContentLoaded


initCheckboxes();
Let's also reset the grid when the micro:bit is first connected, so that it shows a happy face. The drawGrid() function is already provided. This function works similarly to sendGrid(); it takes an array of 1s and 0s, and checks the checkboxes as appropriate.

script.js - clickConnect()


// CODELAB: Reset the grid on connect here.
drawGrid(GRID_HAPPY);
sendGrid();
Try it
Now, when the page opens a connection to the micro:bit, it will send a happy face. Clicking the checkboxes will update the display on the LED matrix.

Reload the page.
Click the Connect button.
In the Serial Port chooser dialog, select the BBC micro:bit device and click Connect.
You should see a smile shown on the micro:bit LED matrix.
Draw a different pattern on the LED matrix by changing the checkboxes.

6. Hook up the micro:bit buttons
Add a watch event on the micro:bit buttons
There are two buttons on the micro:bit, one on either side of the LED matrix. Espruino provides a setWatch function that sends an event/callback when the button is pressed. Because we want to listen to both buttons, we'll make our function generic and have it print the details of the event.

script.js - watchButton()


// CODELAB: Hook up the micro:bit buttons to print a string.
const cmd = `
  setWatch(function(e) {
    print('{"button": "${btnId}", "pressed": ' + e.state + '}');
  }, ${btnId}, {repeat:true, debounce:20, edge:"both"});
`;
writeToStream(cmd);
Next, we need to hook up both buttons (named BTN1 and BTN2 on the micro:bit board) each time the serial port is connected to the device.

script.js - clickConnect()


// CODELAB: Initialize micro:bit buttons.
watchButton('BTN1');
watchButton('BTN2');
Try it
In addition to showing a happy face when connected, pressing either of the buttons on the micro:bit will add text to the page indicating what button was pressed. Most likely, each character will be on its own line.

Reload the page.
Click the Connect button.
In the Serial Port chooser dialog, select the BBC micro:bit device and click Connect.
You should see a smile shown on the micro:bits LED matrix.
Press the buttons on the micro:bit and verify that it appends new text to the page with details of the button pressed.

7. Use a transform stream to parse incoming data
Tip: If streams are new to you, check out MDN's Streams API concepts. This codelab only barely scratches the surface of streams and stream handling.

Basic stream handling
When one of the micro:bit buttons is pushed, the micro:bit sends data to the serial port through a stream. Streams are very useful, but they can also be a challenge because you won't necessarily get all of the data at once, and it may be arbitrarily chunked up.

The app currently prints the incoming stream as it arrives (in readLoop). In most cases, each character is on its own line, but that's not very helpful. Ideally, the stream should be parsed into individual lines, and each message shown as its own line.

Transforming streams with TransformStream
To do that, we can use a transform stream ( TransformStream), which makes it possible to parse the incoming stream and return parsed data. A transform stream can sit between the stream source (in this case, the micro:bit), and whatever is consuming the stream (in this case readLoop), and can apply an arbitrary transform before it's finally consumed. Think of it like an assembly line: As a widget come down the line, each step in the line modifies the widget, so that by the time it gets to its final destination, it's a fully functioning widget.

For more information, see MDN's Streams API concepts.

Transform the stream with LineBreakTransformer
Let's create a LineBreakTransformer class, which will take a stream in and chunk it based on line breaks (\r\n). The class needs two methods, transform and flush. The transform method is called every time new data is received by the stream. It can either enqueue the data or save it for later. The flush method is called when the stream is closed, and it handles any data that hasn't been processed yet.

In our transform method, we'll add new data to container, and then check to see if there are any line breaks in container. If there are, split it into an array, and then iterate through the lines, calling controller.enqueue() to send the parsed lines out.

script.js - LineBreakTransformer.transform()


// CODELAB: Handle incoming chunk
this.container += chunk;
const lines = this.container.split('\r\n');
this.container = lines.pop();
lines.forEach(line => controller.enqueue(line));
When the stream is closed, we'll simply flush any remaining data in the container out using enqueue.

script.js - LineBreakTransformer.flush()


// CODELAB: Flush the stream.
controller.enqueue(this.container);
Finally, we need to pipe the incoming stream through the new LineBreakTransformer. Our original input stream was only piped through a TextDecoderStream, so we need to add an additional pipeThrough to pipe it through our new LineBreakTransformer.

script.js - connect()


// CODELAB: Add code to read the stream here.
let decoder = new TextDecoderStream();
inputDone = port.readable.pipeTo(decoder.writable);
inputStream = decoder.readable
  .pipeThrough(new TransformStream(new LineBreakTransformer()));
Try it
Now, when you press one of the micro:bit buttons, the data printed should be returned on a single line.

Reload the page.
Click the Connect button.
In the Serial Port chooser dialog, select the BBC micro:bit device and click Connect.
You should see a smile shown on the micro:bit LED matrix.
Press the buttons on the micro:bit and verify that you see something like the following:
6c2193880c748412.png

Transform the stream with JSONTransformer
We could try to parse the string into JSON in the readLoop, but instead, let's create a very simple JSON transformer that will transform the data into a JSON object. If the data isn't valid JSON, simply return what came in.

script.js - JSONTransformer.transform


// CODELAB: Attempt to parse JSON content
try {
  controller.enqueue(JSON.parse(chunk));
} catch (e) {
  controller.enqueue(chunk);
}
Next, pipe the stream through the JSONTransformer, after it has gone through the LineBreakTransformer. This allows us to keep our JSONTransformer simple, since we know that the JSON will only ever be sent on a single line.

script.js - connect


// CODELAB: Add code to read the stream here.
let decoder = new TextDecoderStream();
inputDone = port.readable.pipeTo(decoder.writable);
inputStream = decoder.readable
  .pipeThrough(new TransformStream(new LineBreakTransformer()))
  .pipeThrough(new TransformStream(new JSONTransformer()));
Try it
Now, when you press one of the micro:bit buttons, you should see [object Object] printed on the page.

Reload the page.
Click the Connect button.
In the Serial Port chooser dialog, select the BBC micro:bit device and click Connect.
You should see a smile shown on the micro:bit LED matrix.
Press the buttons on the micro:bit, and verify that you see something like the following:
Responding to button presses
To respond to micro:bit button presses, update readLoop to check whether the data it has received is an object with a button property. Then, call buttonPushed to handle the button push.

script.js - readLoop()


const { value, done } = await reader.read();
if (value && value.button) {
  buttonPushed(value);
} else {
  log.textContent += value + '\n';
}
When a micro:bit button is pushed, the display on the LED matrix should change. Use the following code to set the matrix:

script.js - buttonPushed()


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
Try it
Now, when you press one of the micro:bit buttons, you the LED matrix should change to either a happy face or a sad face.

Reload the page.
Click the Connect button.
In the Serial Port chooser dialog, select the BBC micro:bit device and click Connect.
You should see a smile shown on the micro:bits LED matrix.
Press the buttons on the micro:bit, and verify that the LED matrix changes.

8. Closing the serial port
The final step is to hook up the disconnect functionality to close the port when the user is done.

Close the port when the user clicks the Connect/Disconnect button
When the user clicks the Connect/Disconnect button, we need to close the connection. If the port is already open, call disconnect()and update the UI to indicate that the page is no longer connected to the serial device.

script.js - clickConnect()


// CODELAB: Add disconnect code here.
if (port) {
  await disconnect();
  toggleUIConnected(false);
  return;
}
Close the streams and the port
In the disconnect function, we need to close the input stream, close the output stream, and close the port. To close the input stream, call reader.cancel(). The call to cancel is asynchronous, so we need to use await to wait for it to complete:

script.js - disconnect()


// CODELAB: Close the input stream (reader).
if (reader) {
  await reader.cancel();
  await inputDone.catch(() => {});
  reader = null;
  inputDone = null;
}
To close the output stream, get a writer, call close(), and wait for the outputDone object to be closed:

script.js - disconnect()


// CODELAB: Close the output stream.
if (outputStream) {
  await outputStream.getWriter().close();
  await outputDone;
  outputStream = null;
  outputDone = null;
}
Finally, close the serial port and wait for it to close:

script.js - disconnect()


// CODELAB: Close the port.
await port.close();
port = null;
Try it
Now, you can open and close the serial port at will.

Reload the page.
Click the Connect button.
In the Serial Port chooser dialog, select the BBC micro:bit device and click Connect.
You should see a smile shown on the micro:bit LED matrix
Press the Disconnect button and verify that the LED matrix turns off and there are no errors in the console.
