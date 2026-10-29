/*
  Card text for Room 3, Prototype 5.
  Edit titles and paragraphs freely. Keep the six ids as they are: sketch.js unlocks each card by its id.

    brain   unlocks after dragging the brain waves on the headband
    blink   unlocks after three blinks
    heart   unlocks after four taps on the heart
    lid     unlocks after moving the laptop lid through a wide swing
    knock   unlocks after one TAP and one HIT on the box
    shake   unlocks after shaking the drop all the way up

  Optional per card: image ('img/file.jpg' or a link), imageAlt, credit, creditUrl. A photo from SPARK
  would fit here. A card without a photo just shows its text.
*/
window.CARDS = [
  {
    id: 'brain',
    eyebrow: 'Headband · raw EEG',
    title: 'Three waves, three voices',
    hint: 'Drag one of the three brain waves on the headband.',
    body: [
      'In the performance I wear an EEG headband. It sends its raw signal split into bands, and I use three of them: alpha, beta and delta.',
      'Each band sets the pitch of one synth layer. The three layers play a four step sequencer that never stops, so the melody is always there, and it moves as my brain does.',
      'Nobody here wears the headband, so the three waves drift on their own, like a recording of one. Drag any of them to take over. Let go, and after a few seconds it drifts again.'
    ]
  },
  {
    id: 'blink',
    eyebrow: 'Headband · blink and focus',
    title: 'Blink for the bell',
    hint: 'Tap the eyes to blink. Three times.',
    body: [
      'The headband also picks up blinks. Every blink rings a bell.',
      'It reads a focus level too, and focus feeds a delay on the bell. While I play, focus keeps climbing, the echoes pile up, and the bell turns into a smear. The room here swirls with it.',
      'Raising my eyebrows brings focus down, and it stays down while I hold them up. Hold the eyebrows up here to do the same. The eyes also blink on their own every few seconds, and you can blink on top.'
    ]
  },
  {
    id: 'heart',
    eyebrow: 'Apple Watch · heart rate',
    title: 'The tempo is a heartbeat',
    hint: 'Tap the heart on the watch like a heartbeat.',
    body: [
      'An Apple Watch reads my heart rate, and the heart rate is the clock for the whole patch: the melody, the beat and the drop all follow it.',
      'At SPARK the patch ran at 60 BPM.',
      'Here you are the heart. Tap it like a heartbeat, and the patch runs at half of what you tap: tap 120 and the tempo is 60. Leave it, and it settles back to 60.'
    ]
  },
  {
    id: 'lid',
    eyebrow: 'Laptop · lid angle',
    title: 'The hinge plays bass',
    hint: 'Drag the laptop lid open and closed.',
    body: [
      'The laptop knows the angle of its own lid. I route that angle to a distorted bass.',
      'Open it wider and the bass gets louder and rougher. Bring it down and the bass goes away. It never closes all the way.'
    ]
  },
  {
    id: 'knock',
    eyebrow: 'Laptop · tap and hit',
    title: 'Knock on the box',
    hint: 'Tap TAP and HIT on the black box.',
    body: [
      'The laptop also feels knocks, and anything it rests on passes the knock along. At SPARK it sat on a short wooden box, so the whole box became a drum.',
      'A light tap plays a snare over the beat. A hard hit plays a distorted techno kick that drowns out the normal one.',
      'A phone screen can’t feel how hard you hit, so here they are two pads.'
    ]
  },
  {
    id: 'shake',
    eyebrow: 'Phone · shake',
    title: 'The drop',
    hint: 'Shake the phone hard, and keep going.',
    body: [
      'Shaking a phone is the drop. The melody ducks, the beat cuts out so the kicks never pile up, and a fast kick fades in at four times the heart. At 60 BPM, that is 240.',
      'The harder and longer I shake, the more effort goes in, and a swirling riser climbs on top.',
      'Put the phone down and it all falls away, and the melody comes back.'
    ]
  }
];

// An optional photo for the start screen, the same fields as a card's photo. None is set yet.
window.ROOM = {};
