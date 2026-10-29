ECHOES YOU CAN PLAY, ROOM 3: PROTOTYPE 5
Jesse Xu, DIGF-5008


WHAT IS IN THE FOLDER

index.html   the page: start screen, corner buttons, signal map, archive and card sheets
style.css    colours, type, layout of the HTML parts
sketch.js    the p5.js sketch: draws the room, takes the taps and drags, makes the sound
cards.js     the six cards: text and unlock hints

A normal p5.js project (p5.js 1.11.13). Keep the editor's version on 1.11.13, not 2.x.
p5.js and the QR code maker load from the web, so the page needs internet. The sound is the browser's Web Audio, made live. No recordings.


HOW IT PLAYS

The room is my performance setup, opened up. Every source is an object in the room with a cable down to its channel on the rack strip at the bottom, so people can see what drives what. "Signal map" in the corner lists every route.

Always going: the melody (three synth layers on a four step sequencer) and the lo-fi beat (kick and hat).

  Headband, the three waves (top left)   theta, alpha, beta. Each sets the pitch of one layer. They drift on their own like a recording. Drag one to take over; it drifts again 4 seconds after you let go.
  Headband, eyes                         they blink on their own every 2.5 to 6 seconds. Tap them to blink more. Every blink rings the bell.
  Headband, focus (bar under the waves)  rises on its own over about 35 seconds and feeds the bell's delay: more feedback, more echoes, the delay starts to warble and pan, and the room swirls.
  Headband, eyebrows                     hold the forehead above the eyes. The brows stay up while held: the delay is flushed and focus drops and stays low. Let go and it climbs again.
  Apple Watch, heart                     tap it like a heartbeat. The watch shows the heart rate you tap, and the tempo is half of it: tap 120 for 60. Heart held 90 to 200, so the tempo stays 45 to 100. Left alone for 5 seconds it settles back to 60.
  Laptop lid                             drag it. Wider open: louder, brighter, more distorted bass. 22 to 128 degrees, never closed.
  Black box, TAP                         snare over the beat
  Black box, HIT                         distorted techno kick. It ducks everything else for a moment so it lands on its own.
  Phone, shake                           the drop. Melody ducks, the beat closes, a kick on every sixteenth (4 times the heart, 240 at 60) fades in from quiet to loud. Shake hard and keep going: a swirling riser builds. Stop and it all falls away in under a second.
  BEAT on the rack                       turns the lo-fi kick and hat on and off. Whatever it's set to, the drop always closes it, so kicks never overlap.

On a phone: after Tap to start the room shows sideways, turn the phone. Shaking the real phone is the drop (it asks for motion access on iPhone). The threshold is high, so holding the phone and tapping doesn't set it off. If motion is turned down, grab the phone in the room with a finger and shake it.
On a laptop: grab the phone in the room with the mouse and shake it. Keys: T tap, H hit, B blink, E hold the eyebrows, K heart. The start screen shows a QR code to open it on a phone.

Cards unlock from playing, one per part:
01 Three waves, three voices   drag the brain waves
02 Blink for the bell           three blinks of your own
03 The tempo is a heartbeat     four taps on the heart
04 The hinge plays bass         a wide swing of the lid
05 Knock on the box             one TAP and one HIT
06 The drop                     shake it all the way up
"Lock the cards again" at the bottom of the Archive resets them for the next person.


LEFT OUT ON PURPOSE

Meditation to the hat's wetness. It was in the SPARK patch, but it isn't controllable, so this room leaves it out.


THE LINK FOR THE QR CODE

p5 editor: File > Share, copy the Fullscreen link, put it in CONFIG.link at the top of sketch.js. On GitHub Pages leave it empty.


PUT IT ONLINE

p5 editor: new sketch, add cards.js, replace each file's text with the new one, File > Save. Use the Fullscreen link on phones.


TEST BEFORE THE CLASS

Tested with fake taps, drags and a fake shake, at laptop and phone sizes. Not on a real phone yet. Check on your iPhone:
  The start screen reads upright, the room turns after Tap to start.
  Motion access is asked, and shaking hard starts the drop while holding the phone and tapping doesn't. If it's too hard or too easy, change shakeFrom and shakeTo in CONFIG.
  Sound with the silent switch on and off.
  The pads, heart, eyes and brows are easy to hit with a thumb.


WHAT TO TWEAK (CONFIG at the top of sketch.js)

  restBpm, heartMin, heartMax, relaxAfter, relaxRate   the heart
  stepsPerBeat     melody steps per beat. 2 now (eighth notes). Set it to 1 if your patch steps once per beat
  root, scale      the key. A minor pentatonic now
  bandSpan         how far a wave moves its layer
  swing            the lo-fi hats' swing
  focusRise, focusFall   how fast focus climbs, and drops while the brows are held
  blinkEvery       the natural blink interval
  lidMin, lidMax, lidStart
  shakeFrom, shakeTo   phone shake threshold and full effort, in m/s²
  wiggleFrom, wiggleTo the same for shaking the phone in the room by hand
  dropRise, dropFall, dropMultiple, riserFrom, riserBuild, riserFall
  unlock           every card's threshold
LAYERS: each layer's wave shape, octave, four step pattern, note length and level.
cards.js: all card text. Keep the six ids.


MY PATCH VERSUS THIS ROOM

From my setup: the sources and where each one goes, 60 BPM, the four step sequencer with three layers on alpha, theta and beta, blink to bell, focus to the bell's delay, eyebrows to clear it, the drop at four times the tempo, the riser on sustained effort, the beat closing during the drop, lid to distorted bass, tap to snare, hard hit to distorted kick, the beat switched on and off by hand.
Made for this room: every sound (synthesised to work like the patch, not copied from it), the notes and patterns, the scale, the eighth note step rate, how the lid shapes the bass, the heart as a half speed tap tempo, the natural blink interval, the drifting waves, the visuals.


HOW THE MELODY STAYS IN KEY

Every note comes from one scale, A minor pentatonic (A C D E G).
Each layer is a four step pattern written in scale steps, not semitones (LAYERS in sketch.js): theta 0 0 2 1 from A2, alpha 0 2 4 3 from A3, beta 4 2 3 1 from A4.
Each brain wave moves its whole pattern up 0 to 5 scale steps (one octave). It moves in scale steps, so it can only land on notes of the scale. The pentatonic has no half step clashes, so any stack of the three sounds fine.
The melody steps on eighth notes. Theta, the low layer, holds each note for two steps.
The bass plays the theta layer's current note an octave lower, on a broken sixteenth rhythm (steps 1, 4, 7, 9, 12 and 15 of 16). The lid only sets its level, filter and drive, never its note. That is why it moves with the harmony and never sounds off.
