ECHOES YOU CAN PLAY, ROOM 1: THEREMIN
Jesse Xu, DIGF-5008 Exploration


WHAT IS IN THE FOLDER

index.html   the page: start screen, the corner buttons, archive and card sheets
style.css    colours, type, layout of the HTML parts
sketch.js    the p5.js sketch: draws the room, reads the hands, makes the sound
cards.js     the four history cards: text, unlock hints, sources

A normal p5.js project (p5.js 1.11.13). Keep the editor's version on 1.11.13, not 2.x.
The hand tracking is ml5.js 1.3.1 (handPose), running Google's MediaPipe Hands from the same CDN, with TensorFlow.js as a second try. It loads from the web with p5.js and the QR code maker, so the page needs internet.
The sound uses the browser's Web Audio directly, the same engine p5.sound sits on.


HOW IT PLAYS

The rule of this room: you never touch the instrument. Room 2, the Trautonium, is the opposite.
Phone or laptop, the front camera watches your hands. Nothing is recorded or sent anywhere.
  Right hand (on the right of the mirrored picture): the pitch. Closer to the camera is higher. How big your palm looks stands in for how close it is to the antenna.
  Left hand: the volume, like the real loop. Bring it closer to the camera to go quiet, pull it back to swell.
  One hand only: it plays the pitch at full volume. No hands: silence.
  The room is always wide, like the Trautonium room. The start screen reads the way the phone is held, with the photo on top. After Tap to start, a phone held upright shows the room turned sideways, so people turn the phone and stand it on its side, facing them, about an arm's length away. Rotation lock doesn't matter. A laptop: sit about an arm's length from the screen.
  The screen asks the phone not to sleep while the room is open, since nobody touches it.
"Set my reach" in the corner: hold your right hand far for 3 seconds, then close for 3. The whole range then sits between your far and near. It is saved in that browser.
If the camera is refused or can't open, the start screen says why and offers a fallback: tilting the phone (left and right for pitch, more upright for louder), or the mouse on a laptop (left and right for pitch, up for louder).
On a laptop the start screen also shows a QR code to open the room on a phone.

On the cabinet:
  TONE      from a near sine to a brighter, reedier voice
  VIBRATO   steady vibrato, off at the start
  TUNING    pulls the pitch toward the nearest note. Off at the start, the way a theremin is
  VOLUME    master volume
  OCTAVES   3 or 5. Taped shut until card 03
Knobs: drag right or up to turn up, scroll also turns them, double-click resets.
The display shows the note, how many cents off it is, a tuner needle (the blue band is "in tune" for card 03), the frequency, and bars for each hand.

Cards unlock from playing. Only sound you can hear counts.
01 Play without touching   1.5 seconds of sound
02 Petrograd, 1920         one glide across a whole octave without the sound stopping
03 Clara Rockmore          hold one note within 20 cents for 2 seconds. Opens the five octave range
04 Spellbound, 1945        three swells with the volume hand, from quiet to loud, while the pitch hand plays
"Lock the cards again" at the bottom of the Archive resets everything for the next person.


THE LINK FOR THE QR CODE

In the p5 editor: File > Share, copy the Fullscreen link. In sketch.js, near the top, put it between the quotes:
  link: 'https://editor.p5js.org/yourname/full/xxxxxxxx',
On GitHub Pages you can leave it empty. The page reads its own address.


PUT IT ONLINE

p5 editor: make a new sketch, add cards.js, then replace each file's text with the new one (click the file, Command A, paste), then File > Save. Use the Fullscreen link on phones.
If the editor's frame blocks the camera on a phone, put the same four files on GitHub Pages (as with the Trautonium room).


TEST BEFORE THE CLASS

Not tested on a real phone yet. The hands in testing were fake ones fed into the room, because the hand tracker's model can't download in the test setup. Check on your iPhone:
  The camera asks permission and the room says "CAMERA · 2 HANDS" when both hands are up.
  How long the hand tracker takes to load the first time, on campus Wi-Fi.
  Whether it keeps up: if the pitch jumps around, raise pitchSmooth in CONFIG.
  Run "Set my reach" once. If the range still feels off, change far and near in CONFIG.
  Sound with the silent switch on and off. The screen stays awake.
  All four cards unlock. Read opens them.
  Refuse the camera once: the tilt fallback plays.


WHAT TO TWEAK

sketch.js, CONFIG at the top:
  link            the room's address, for the laptop's QR code
  far, near       palm size at your farthest and nearest playing distance ("Set my reach" replaces them)
  volFull, volSilent  where the volume hand is full and silent, on the same far (0) to near (1) scale as the pitch hand
  steady, follow  the shake filter on each hand. Lower steady is steadier when still, higher follow catches up faster
  ranges          the notes of the 3 and 5 octave settings
  pitchSmooth, volSmooth   how much the tracking shake is smoothed. Higher is steadier but lazier
  holdLost        how long a hand the tracker loses for a moment keeps sounding
  vibratoRate, vibratoMax, reverb, room, and every unlock threshold
sketch.js, MODES below it: the help text people see on a phone and a laptop.
sketch.js, KNOBS: knob names and starting positions.
cards.js: all card text. Keep the four ids (air, petrograd, rockmore, spellbound).


PHOTOS

All from Wikimedia Commons, linked straight from there, licence checked on each file's page. Each card credits its photo and links to that page.
  Start screen and card 01   RCA Theremin AR-1264, about 1930, Kunstmuseum Den Haag. WikiSander, 2022, CC BY-SA 4.0
  Card 02   Leon Theremin with his instrument opened, The New York Times, January 29, 1928. Public domain
  Card 03   Clara Rockmore at her theremin, 1932. Renato Toppo. Public domain
  Card 04   Moog Etherwave theremin built from a kit. Hutschi, 2005, CC BY-SA 3.0
There is no freely licensed photo of Samuel Hoffman on Commons, so card 04 shows the Moog Etherwave, which ties to the card's last paragraph about Moog's theremin kits.
The two public domain photos are public domain by Commons' own tagging. I didn't check the copyright history beyond that.


HISTORY VERSUS DESIGN CHOICES

Historical: two antennas as the plates of capacitors with the hand; two radio frequency oscillators, one fixed and one pulled by the pitch antenna, heard as their difference; closer to the pitch antenna is higher; further from the volume loop is louder (Wikipedia, "Theremin"). Rockmore's instrument went from three octaves to five (Wikipedia, "Clara Rockmore"). The RCA cabinet with the rod on the right and the loop on the left is the familiar layout; this cabinet is a simplified drawing, not a replica.
Design choices: a camera and the size of each hand instead of capacitance; pitch spread evenly in notes across the reach (a real theremin crowds its high notes close to the antenna); the tone, vibrato and tuning knobs; the five octave switch as a reward; the room reverb.
Dates: Wikipedia dates the theremin to October 1920; Lemelson-MIT puts the first prototype in 1918 in Petrograd. Card 02 uses the 1920 date and Petrograd.


SOURCES

Wikipedia, "Theremin": https://en.wikipedia.org/wiki/Theremin
Wikipedia, "Leon Theremin": https://en.wikipedia.org/wiki/Leon_Theremin
Lemelson-MIT, "Leon Theremin": https://lemelson.mit.edu/resources/leon-theremin
Wikipedia, "Clara Rockmore": https://en.wikipedia.org/wiki/Clara_Rockmore
Wikipedia, "Samuel Hoffman": https://en.wikipedia.org/wiki/Samuel_Hoffman
ml5.js handPose: https://docs.ml5js.org/#/reference/handpose
QR codes: qrcode-generator by Kazuhiko Arase, MIT licence, https://www.npmjs.com/package/qrcode-generator
