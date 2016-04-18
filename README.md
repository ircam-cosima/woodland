# Woodland #

This experiment consists in the creation of a reverberation process
distributed in space. Like in a forest, a sound coming from a tree will
propagate in space over time, and reflect from the nearby trees, generating
more sources, that will propagate again.

The model is very simple, and made only of delays, that depend on the
distance, and attenuations, that depend on distance and on the
reflection. This simplicity enables to generate a lot of echoes (typically
several thousands per device), and every rendering is space and time is
unique.

## How to use it ##

### Installation ###

You need [Node.js]. Install the dependencies and build:

``` shell
npm install;
gulp
```

Here is an example that restarts the server without building again, with
debug messages and log filtering:
``` shell
killall node; DEBUG="soundworks*" npm run start | bunyan -c "this.channel !== 'performance:click'"
```

Now the server should run on port 8888. Clients can connect to <http://localhost:8888/>

Each client must physically go to the position that corresponds to the
label on the welcome screen. You need to adapt the file [positions.json] to your
actual setting: every position is a label with x and y coordinates, in metres,
from an arbitrary origin.

Be sure to quit any running process on any client device, including the
browser. The, restart the browser, and *do reload* the page, to avoid any
problem with the cache. And reload the page any time a problem occurs.

Somebody will get a sound. When you throw it in the air, it will fall back
to the device that is the most horizontal. The sound will propagate from there.

### Druid ###

To control the experiment, you must connect a device to
<http://localhost:8888/druid>

For any control, you can use the box number to type a value, `=` buttons to
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

This experiment is built with the [Soundworks framework], that provides
communication, synchronisation, calibration, etc. The license is
[BSD-3-Clause].


[BSD-3-Clause]: https://opensource.org/licenses/BSD-3-Clause
[Node.js]: https://nodejs.org
[positions.json]: ./data/positions.json
[druid_presets.json]: ./data/druid_presets.json
[Soundworks framework]: https://github.com/collective-soundworks/soundworks
[soundworks-calibration]: https://github.com/collective-soundworks/soundworks-calibration