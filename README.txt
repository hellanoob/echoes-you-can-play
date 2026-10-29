ECHOES YOU CAN PLAY: ALL THREE ROOMS
Jesse Xu, DIGF-5008


WHAT IS IN THE FOLDER

index.html, style.css, sketch.js   the hall: three cards, pick a room and press Enter
theremin/        Room 1, the same files as the Theremin sketch
trautonium/      Room 2, the same files as the Trautonium sketch
prototype-5/     Room 3, the same files as the Prototype 5 sketch

Each room is still its own page with its own Tap to start, so the camera, motion and sound work the same as they do on their own. Going into a room loads it; Exit leaves it and stops its sound and camera.

Getting out of a room:
  Exit, the first button in the room's corner
  "‹ All rooms" at the top of its start screen (also under How to play)
Both only show when the room was opened from the hall. A room opened on its own link looks exactly as before.


PUT IT ONLINE: TWO WAYS

1. GitHub Pages (the sure way, and one QR code for everything)
   Upload the whole folder as it is, keeping the three room folders. Nothing to edit. The hall's own address is the one link and QR code to share. On a laptop the hall shows its QR code at the bottom.

2. The p5 editor
   a) One sketch: make the three folders in the sketch (theremin, trautonium, prototype-5) and add each room's files to its folder, then the hall's three files at the top. I haven't been able to check that the editor serves an index.html from inside a folder, so test this before relying on it. If a room doesn't open, use b) or GitHub Pages.
   b) Four sketches: keep the three room sketches you have and make a fourth for the hall.
      In the hall's sketch.js, CONFIG.rooms: paste each room's Fullscreen link between the quotes.
      In each room's sketch.js, CONFIG.hub near the top: paste the hall's Fullscreen link, so Exit knows the way back.
      Not tested either: the editor runs each sketch inside its own frame, and it may stop a room from sending the whole window back to the hall. If Exit opens the hall inside the room's frame, or does nothing, go with GitHub Pages.


WHAT CHANGED IN THE ROOMS

Only the way out: an Exit button in the corner and "‹ All rooms" on the start screen (both hidden unless the room came from the hall), CONFIG.hub, and a few lines at the very end of each sketch.js. Nothing about how the rooms play changed.


TESTED

With a local server and fake taps, at laptop and phone sizes: the hall, entering each room, starting it, Exit back to the hall, "‹ All rooms" back to the hall, and a room opened on its own showing no Exit. All three rooms' own tests still pass. Not on a real phone yet, and not in the p5 editor.


PHOTOS ON THE CARDS

Room 1: RCA Theremin, about 1930, Kunstmuseum Den Haag. Photo: WikiSander, 2022, Wikimedia Commons, CC BY-SA 4.0.
Room 2: Mixtur-Trautonium, Musikinstrumenten-Museum Berlin. Photo: Morn the Gorn, Wikimedia Commons, CC BY-SA 3.0.
Room 3: a drawing, made for this page. A photo from SPARK would fit here later.
