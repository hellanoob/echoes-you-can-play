ECHOES YOU CAN PLAY, ROOM 2: TRAUTONIUM
Jesse Xu, DIGF-5008 Exploration


WHAT IS IN THE FOLDER

index.html   the page: start screen, the corner buttons, archive and card sheets
style.css    colours, type, layout of the HTML parts
sketch.js    the p5.js sketch: draws the instrument, makes the sound, reads the rails, tongues, keys and knobs
cards.js     the four history cards: text, unlock hints, sources

It is a normal p5.js project (p5.js 1.11.13). setup() and draw() are in sketch.js. Keep the editor's version on 1.11.13, not 2.x.
The sound uses the browser's Web Audio directly, the same engine p5.sound sits on, because each manual needs its own filters and vibrato.
p5.js, the QR code maker and the fonts load from the web, so the page needs internet.
The Mac app (the TrautoniumMac folder) runs these same files and adds every finger on the trackpad. See its own README.


HOW IT PLAYS

This room is played on a phone. Two manuals, like Sala's Mixtur-Trautonium: the back rail (II) and the front rail (I). Three octaves each, C3 to C6.
The rails always run left to right, like the real instrument. The start screen reads the way the phone is held. After Tap to start, a phone held upright shows the whole room turned sideways, so people just turn the phone. Nothing asks them to.
Lay the phone on something soft, like a pillow or your lap, and put a finger on each rail.
A finger that only rests is silent, like the real wire. Press down and the phone tips a little, and that tip is the volume.
  Why silent: on the classic manual the plate sits on springs, its rest position is no sound and its lowest position is full volume (Doepfer).
  If someone sits on a silent note for 2.5 seconds, a note says to press harder.
  The same push tips the phone more the further it is from the middle, and the back rail runs near the middle, so the room divides the tip by how much a press at that spot should tip it. See tipScale in sketch.js.
  Each finger gets its own share of the tip. The phone tips toward the push, so the tip has a direction as well as a size, and the room knows where every finger is. Each finger's push tips the phone along its own line from the middle, so the room works out how hard each one pushed (splitTilt in sketch.js). Left-right and up-down are two numbers, enough to tell two fingers apart.
  Press the right end of the back rail with the front rail's finger resting on the left, and only the back rail gets louder.
  The one blind spot: two fingers in line with the middle of the phone, like both near the middle of the rails. There the tip can't say which one pushed, so they share it. The further apart along the rails, the cleaner the split. Fingers on the same side come apart less exactly, but the harder one stays louder.
  A finger turning a knob presses the phone too. It's part of the sum, so its push doesn't leak into a rail.
  The room also checks the phone's sense of direction: a single finger pressing has to tip the phone toward itself. If the phone reports its axes swapped or flipped, a few seconds of firm single presses fix it.
  Phone screens can't feel pressure, so this is a stand-in. If motion is blocked, pressing lower on a rail is louder, with a quiet sound even at rest.
Each rail is one wire, so it plays one note at a time. Press a second point on the same wire and the highest one sounds, as on the Trautoniks VT2012, a Trautonium built today (Sound On Sound). Let go of it and the next highest still held sounds, so you can trill upward: hold a note and tap above it. Sliding the top finger below another one hands the sound to that one.
Each rail has its own octave switch, so the back rail can sit an octave under the front one, or over it. The note names printed on the rail follow its switch.
A finger that holds still is drawn most of the way into tune, in about a tenth of a second. A slide glides freely, so the swoops still work. On a phone rail a fingertip is wider than a semitone, so without this most held notes would sit between two notes. The real wire had no such help. Its in-tune aid was the tongues. CONFIG.snap sets how much, and 0 turns it off.

A laptop in a browser gets one point from its trackpad, so it can only play one rail at a time. It first sees "this room is played on a phone" with a QR code of the room's address, and "Play here with the mouse" for anyone without a phone to hand.
  With the mouse: click lower on the rail for louder, or in Safari on a MacBook, press the trackpad harder. Keys 1 to = play the back rail's tongues, Q to ] the front rail's.
  The QR code needs the room's address. On GitHub Pages the page knows it. In the p5 editor it doesn't, because the editor runs sketches inside a frame, so paste the address into CONFIG.link at the top of sketch.js (see below).
An Apple Pencil's pressure is used when there is one.

The tongues sit on C, D, G and A in each octave, the way Sala set his. Tap, click or key them.
Knobs turn left to right, so dragging right turns them up. Dragging up works too. Every finger can turn its own knob, so you can play both rails and turn knobs at the same time.
  An iPhone tracks 5 fingers at once (two rails and three knobs). A 6th finger makes iOS drop all of them, so every note stops. iPads track 11.
  A finger on a knob presses the phone too, so a heavy hand on a knob nudges the volume. Keep knob fingers light.
  Scroll also turns them, double-click resets. Hold Shift for fine moves.
  OKTAVE      two switches, II for the back rail on top and I for the front rail below. Each moves its rail down or up an octave. Tap beside the lever to move it that way, or slide it
  MIXTUR      subharmonics under the tone (taped shut until card 03)
  FORMANT     the formant filters, dark to bright
  RESONANZ    how sharp the formants are
  VIBRATO     steady vibrato
  LAUTSTÄRKE  volume
Displays: TON I and TON II show each rail's note, FREQUENZ the last note played. PEGEL is the output level, DRUCK is the pressure, and its small word says where the pressure comes from (tilt, depth, trackpad or pencil). Small screens leave the two meters out.
The wire never moves sideways. Where it is pressed, its shadow meets it on the rail, and the rail darkens a little as it is pushed down.
"How to play" in the corner brings the start screen back.

The sound aims for a reedy, buzzy voice, not a ghost-movie wail:
  more of the raw sawtooth and less of the two vowel-like formants, with the formants less sharp by default
  a soft saturation after the volume, so a hard press gets more bite and a light one stays clean
  pressing harder also opens up the top end
  held notes in tune, and a new press starts on its own pitch instead of scooping up from the last note
  a short, darker room, a small drift and no vibrato until you turn it up
The eerie sound is still there when you want it: Resonanz and Vibrato up, slow slides. For the birds, Mixtur up and fast swoops.

Cards unlock from playing. Only time you can hear counts. The paper label on the panel shows the next one. On a phone there is no room for it, so the Archive lists what each locked card needs.
01 Press the wire     1.5 seconds of sound
02 Berlin, 1930       one glide across a whole octave without letting go
03 Oskar Sala         hold one sounding note steady for 3 seconds (a ring fills around the contact). This also takes the tape off Mixtur.
04 The Birds          Mixtur turned up, then 4 fast swoops that reach the top part of a rail

"Lock the cards again" at the bottom of the Archive resets everything for the next person.


THE LINK FOR THE QR CODE

In the p5 editor: File > Share, copy the Fullscreen link. In sketch.js, near the top, put it between the quotes:
  link: 'https://editor.p5js.org/yourname/full/xxxxxxxx',
On GitHub Pages you can leave it empty. The page reads its own address.


PUT IT ONLINE

p5 editor: replace each file's text with the new one (click the file, Command A, paste), then File > Save. The Fullscreen link is the one for phones and for Canvas.
GitHub Pages, if the editor's frame ever blocks the phone's tilt:
1. New repository on GitHub, something like trautonium-room, set to Public.
2. Add file > Upload files. Drag in index.html, style.css, sketch.js and cards.js. Commit.
3. Settings > Pages. Source: Deploy from a branch. Branch: main, folder / (root). Save.
4. After a minute or two the address shows at the top of that page, like https://yourname.github.io/trautonium-room/


TEST LIST

iPhone, from the Fullscreen link: held upright, the start screen reads upright. Tap to start, allow motion, then the room shows sideways. Turn the phone.
On a pillow or your lap: a resting finger is silent. Press down and the sound comes in. DRUCK should say tilt.
Press the back rail and the front rail with the same force. They should come out about as loud as each other. If the back rail is too loud or too quiet, change CONFIG.lap.scale.
One finger on the right end of the back rail, one on the left end of the front rail. Press only the right one: only the back rail should get louder. Then only the left one.
Hold a note still: it should settle in tune (the TON display reads the note). Slide fast: it should glide, not step.
Two fingers on one rail: the higher one sounds. Lift it and the lower one sounds.
OKTAVE: tap beside a lever and that rail's note names change, and so does its pitch.
If the tilt does nothing there (DRUCK says depth), the editor's frame is blocking motion. Try the same files on GitHub Pages.
With rotation lock on, the room still shows sideways when held upright after starting.
Sound with the silent switch on and off.
Knobs turn when you drag right, and two or three turn at once while both rails play. Tongues play. All four cards unlock. Read opens them, and the cards scroll.
On a laptop: the QR code opens the room on your phone. "Play here with the mouse" plays.
Note down anything that confuses people for the Oct 24 polish.


WHAT TO TWEAK

sketch.js, CONFIG at the top:
  link            the room's address, for the laptop's QR code
  lap.range       degrees of tip for full volume, pressing the middle of the front rail. Lower = easier
  lap.deadzone    degrees of tip ignored, so breathing stays silent
  lap.scale       how much the spot you press can change that, least and most
  lap.even        when the tip can't tell two fingers apart, how strongly it falls back to an even split. Higher is steadier but less exact
  lap.smooth      seconds over which each finger's share settles
  floor           loudness with no pressure, where pressure is only a stand-in
  pad             the Mac app's levels
  snap            how far a still finger is drawn into tune, 0 to 1. 0 is the raw wire
  snapSpeed       how fast a finger has to move to count as sliding, in semitones a second
  snapTime        how quickly a finger that stops settles into tune
  drift           cents of slow wobble on every note. More sounds seasick
  reverb, room    how much room and how long it rings
  also range, glide, vibrato, tongue notes, keyboard keys and every unlock threshold
sketch.js, MODES below it: what a phone, a laptop and the Mac app do, and the help text people see.
sketch.js, KNOBS below that: knob names and starting positions, including the two octave switches.
cards.js: all card text. Keep the four ids (wire, berlin, sala, birds).
Archival images: each card has image, imageAlt, credit and creditUrl in cards.js. To swap one, change those four lines. Credit every image.


ARCHIVAL IMAGES

Each card shows one photo, loaded from Wikimedia Commons. The credit under it links to the photo's own Commons page, which shows its licence. The licences were checked on Commons on 20 October 2026.
01 Press the wire   Mixtur-Trautonium, Berlin, 1955, Musikinstrumenten-Museum Berlin. Photo: Morn the Gorn, 2010. CC BY-SA 3.0. https://commons.wikimedia.org/wiki/File:MIM_Mixtur-Trautonium_CN5834.jpg
02 Berlin, 1930     Telefunken Volkstrautonium, Berlin, 1933/34, Musikinstrumenten-Museum Berlin. Photo: Museumsinsulaner, 2009. Public domain (released by the photographer). https://commons.wikimedia.org/wiki/File:Volkstrautonium_MIM.jpg
03 Oskar Sala       Oskar Sala in his studio, 1996. Photo: Peter Pichler. CC BY 4.0. https://commons.wikimedia.org/wiki/File:Oskar_Sala_-_1996_-_Photo_Peter_Pichler.jpg
04 The Birds        Mixtur-Trautonium, Deutsches Museum Bonn. Photo: Matthias Kabel, 2006. CC BY 2.5. https://commons.wikimedia.org/wiki/File:Mixtur_Trautonium.jpg
Start screen: the card 01 photo again, set in cards.js as window.ROOM. On a laptop it sits beside the title, whole, like a gallery page. On a phone it is a dim backdrop behind the title, so its credit there says "cropped and dimmed". CC BY-SA allows that as long as the change is noted and the changed photo stays under CC BY-SA.
The card photos are shown whole and unedited. Where photos can't load (no internet, the offline Mac app, a page that blocks outside images), the card leaves the photo out and still reads fine. On a phone on its side the photo sits beside the text.
Left out on purpose: stills and the poster from The Birds. Commons lists some as public domain under US rules about copyright notices, and those rules don't decide copyright in Canada. A 1930 photo catalogued under Friedrich Trautwein, by Bruno Müller (Archiv des Deutschen Museums, CC BY-NC-SA 4.0, on Europeana), would suit card 02, but its image link didn't load over https when tested, so a web page can't show it reliably.
CC BY-NC-SA and similar non-commercial licences are fine for a class project, not for anything sold, like a paid app.


HISTORY VERSUS DESIGN CHOICES

Historical: a wire pressed onto a metal plate closes a circuit and sounds a tone; pitch set by where you press, rising left to right; neon-tube oscillators with sawtooth-like waves; formant (band-pass) filters; Sala's subharmonics at fractions of the main pitch; two manuals on the Konzert- and Mixtur-Trautonium, each about 3 1/2 octaves; spring tongues above the wire that can be pressed like keys, which Sala set on C, D, G and A in each octave (Doepfer).
Pressure: Doepfer describes the classic manual's plate on an axis with springs under it. Its rest position is no sound and its lowest position is full volume. Wikipedia and Sound On Sound also say pressure sets the volume. Holmes says the very first instrument used a foot pedal. Vibrato came from the player's hand; Holmes describes Sala pressing the tongues side to side.
Two fingers on one wire: on the Trautoniks VT2012 "the highest takes priority" (Sound On Sound), and this room does the same. What Sala's own instrument did isn't documented. With the wiring Doepfer describes (both ends of the wire on a voltage source, the plate picking up the voltage), two contacts would probably give one pitch between them. That's a reading of the wiring, not something Doepfer states. A second fingerboard was added in 1934 so two notes could sound at once (Holmes).
Octave per rail: on the Konzert- and Mixtur-Trautonium each manual had its own sound unit (Doepfer), and the VT2012 has an octave switch (Sound On Sound). How Sala set his two manuals isn't documented here, so a three-way switch per rail is this room's version.
Design choices: three octaves per rail instead of about 3 1/2; one three-way octave switch per rail; drawing a still finger into tune; the soft saturation; the phone's tip, the depth below the wire, trackpad force or the Pencil standing in for pressure; dividing the tip by where you press, and splitting it between the fingers by where they are; pressure past the deep click adding vibrato on a trackpad; keyboard keys for the tongues; the knob set, simplified from real panels; the exact filter settings; the room reverb.


SOURCES

Wikipedia, "Trautonium": https://en.wikipedia.org/wiki/Trautonium
Wikipedia, "Oskar Sala": https://en.wikipedia.org/wiki/Oskar_Sala
IEEE Spectrum, "How the Trautonium Found Favor With Nazis and Gave Hitchcock's The Birds Its Distinctive Screech": https://spectrum.ieee.org/how-the-trautonium-found-favor-with-nazis-and-gave-hitchcocks-emthe-birdsem-its-distinctive-screech
Thom Holmes, Noise and Notations, 22 October 2023: https://www.thomholmes.com/post/the-distinctive-electronic-music-of-oskar-sala-and-the-mixtur-trautonium-part-1
Hitchcock Wiki, "Hitchcock Chronology: Oskar Sala": https://hitchcockwiki.com/wiki/Hitchcock_Chronology:_Oskar_Sala
Sound On Sound, review of the Trautoniks Trautonium VT2012: https://www.soundonsound.com/reviews/trautoniks-trautonium-vt2012
Doepfer, The Trautonium Project: https://doepfer.de/traut/traut_e.htm
Apple, Responding to Force Touch Events from JavaScript: https://developer.apple.com/library/safari/documentation/AppleApplications/Conceptual/SafariJSProgTopics/RespondingtoForceTouchEventsfromJavaScript.html
Why a trackpad gives a web page no finger positions: MDN, GestureEvent, https://developer.mozilla.org/en-US/docs/Web/API/GestureEvent ; Kenneth Auchenberg, 2018, https://kenneth.io/post/detecting-multi-touch-trackpad-gestures-in-javascript ; W3C Pointer Events list, 2023, https://lists.w3.org/Archives/Public/public-pointer-events/2023OctDec/0015.html
QR codes: qrcode-generator by Kazuhiko Arase, MIT licence, https://www.npmjs.com/package/qrcode-generator
