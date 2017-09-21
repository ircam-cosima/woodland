# Woodland #

This experiment consists in the creation of a reverberation process
distributed in space. Like in a forest, a sound coming from a tree will
propagate in space over time, and reflect from the nearby trees, generating
more sources, that will propagate again.

The model is very simple, and made only of delays, that depend on the
distance, and attenuations, that depend on distance and on the attenuation
on reflection. This simplicity enables to generate a lot of echoes
(typically several thousands per device), and every rendering is space and
time is unique.

## How to use it ##

### Installation ###

You need [Node.js]. Install the dependencies and build:

``` shell
npm install ;
cd node_modules ;
npm install ;
gulp ;
cd ../.. ;
gulp
```

Here is an example that starts the server without building again:
``` shell
npm run start
```

And a more complete one, to restart, with debug messages and log filtering
(bunyan must be in your `$PATH`):
``` shell
killall node; DEBUG="soundworks*" npm run start | bunyan -c "this.channel !== 'performance:click'"
```

Now the server should run on port 8888. Clients can connect to <http://localhost:8888/>

Each client must physically go to the position that corresponds to the
label on the welcome screen. You need to adapt the file [positions.json] to your
actual setting: every position is a label with x and y coordinates, in metres,
from an arbitrary origin.

Be sure to quit any running process on any client device, including the
browser. The, restart the browser, and *do reload the page*, to avoid any
problem with the cache. (And reload the page any time a problem occurs.)

Somebody will get a sound. When you throw it in the air, it will fall back
to the device that is the most horizontal. The sound will propagate from there.

### Druid ###

To control the experiment, you must connect a device to
<http://localhost:8888/druid>

For any control, you can use the box number to enter a value, `=` buttons to
set a value, `-` buttons to decrement a value, and `+` buttons to increment
a value.

The presets are stored in the file [druid_presets.json]. When saving a
preset, use the same name to change it.

The master gain may be used any time, to adjust the level of the
sounds. Do not be shy, +20 dB might be necessary for tiny sounds, but turn
it down to avoid clipping on louder sounds.

The receiver is the one who caught the sound. It might be fair to send the
next sound from there.

You may render again the last propagation, possibly changing the sound and
the master gain, but no other parameter (you would need to throw again the
sound in the air).

The gain threshold is used to stop the propagation, when the sound levels
drops below this attenuation, due to the distance or the multiple
reflections.

The delay threshold is used to stop the propagation, when the total duration from
the first occurrence is longer than this given value.

You may slow down the travel speed of the sound, in order to accommodate
for smaller experimental setups.

The power of a sound source spreads over the distance. You can control
what is the attenuation each time the distance doubles.

Any source may generate a reflection, and the transmission ratio sets the
relative amplitude of any reflection.

### Heterogeneous devices ###

When using different devices (hardware, OS, browser), they may differ in
timing and intensity. Before running the experiment, please connect to
<http://localhost:8888/calibration>, in order to calibrate the devices
against a reference.

See [soundworks-calibration] for the details.


## Details ##

This experiment is built with the [Soundworks] framework, that provides
communication, synchronisation, calibration, etc. It is written in
[ES2015]. The server runs in [Node.js] and the clients run in HTML5 Web
browsers, on mobile devices.

The license is [BSD-3-Clause].

### Architecture ###

![mixed architecture][mixed architecture]
This is a mixed architecture, to mitigate the various constraints:
- Synchronisation: continuous process, that should not suffer blockage from
  other processes.
- Computation of the propagation: centralised to minimise communications.
- Generation of individual impulse responses (from the propagation):
distributed.
- Rendering: distributed, and synchronised.


#### Synchronisation ####

This experiment relies on precise timing across the distributed audio. It
is therefore important to avoid blocking the synchronisation process, that
continuously runs between the server (that provides the reference time) and
each client (that synchronises its local audio time to the reference).

The reference time on the server comes from `process.hrtime` in the main
process, so any heavy work must be done by a separate
[child process]. Similarly, the local audio time in the browser comes from
`AudioContext.currentTime` in the main process, so any heavy work must run
in a separate [Web Worker]. The heavy processes are able to directly
communicate together, to avoid loading the main processes.

[utils.Blocked] is used to monitor any blockage in the main process, in the
server or in the browser.

#### Propagation ####

The computation of the propagation from an original source is
centralised on the server, in order to minimise the communications. It runs
in a separate [child process], `process_propagation`, and do not block the
main process.

#### Impulse response ####

The `process_propagation` communicates directly with each
`worker_propagation`, to transmit the individual delays and
attenuations. Then, each `worker_propagation` computes its own impulse
response.

#### Rendering ####

When each impulse response is ready, a distributed and synchronised
rendering is scheduled on all devices.

In order to be able to render long impulse responses, the
`ConvolverNode.buffer` is the original sound, while the
`AudioBufferSourceNode.buffer` is the actual impulse response. (As the
convolution is commutative, the result is the same.) Then, the sound
samples must be short.

### To do ###

It is far from optimal to create a `Float32Array` in each each
`worker_propagation`, and copy it to the main process. We should transfer,
instead of copying.

Furthermore, it is not possible to create a new `AudioBuffer` out of an
existing `Float32Array`, yet. We re-use the memory of the `AudioBuffer`,
but the copy still occurs. Would it be possible to transfer the inner
`Float32Array` back and forth the `worker_propagation`?

[utils.Blocked] should report upstream (to [node-blocked]) its
modifications for running in a browser.

[BSD-3-Clause]: https://opensource.org/licenses/BSD-3-Clause
[child process]: https://nodejs.org/api/child_process.html
[druid_presets.json]: ./data/druid_presets.json
[ES2015]: https://babeljs.io/docs/learn-es2015/
[mixed architecture]: ./architecture.png
[Node.js]: https://nodejs.org
[node-blocked]: https://www.npmjs.com/package/blocked
[positions.json]: ./data/positions.json
[Soundworks]: https://github.com/collective-soundworks/soundworks
[soundworks-calibration]: https://github.com/collective-soundworks/soundworks-calibration
[utils.Blocked]: https://github.com/ircam-cosima/soundworks-woodland/blob/0.8.2/src/common/utils.es6.js#L18
[Web Worker]: https://developer.mozilla.org/en-US/docs/Web/API/Worker
