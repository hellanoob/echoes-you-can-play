/*
  Card text for the Trautonium room.
  Edit titles, paragraphs and sources freely. Keep the four ids as they are:
  sketch.js unlocks each card by its id.

    wire    unlocks after 1.5 seconds of sound you can hear
    berlin  unlocks after one glide across a whole octave
    sala    unlocks after holding one sounding note steady for 3 seconds (and unlocks the Mixtur knob)
    birds   unlocks after 4 fast swoops up high with Mixtur turned up

  Optional per card: image (a link or 'img/file.jpg'), imageAlt, credit ('What, where. Photo: who, year,
  where it's from, licence.') and creditUrl (the image's own page, which shows its licence).
  The photos load from Wikimedia Commons. Where they can't load (no internet, or a page that blocks
  outside images), the card just leaves the photo out.
*/
window.CARDS = [
  {
    id: 'wire',
    eyebrow: 'How it works',
    title: 'Press the wire',
    image: 'https://commons.wikimedia.org/wiki/Special:FilePath/MIM_Mixtur-Trautonium_CN5834.jpg?width=900',
    imageAlt: 'A Mixtur-Trautonium: a wooden cabinet with a panel of knobs on top, two wire manuals sloping toward the player, and two foot pedals below.',
    credit: 'Mixtur-Trautonium, Berlin, 1955. Musikinstrumenten-Museum Berlin. Photo: Morn the Gorn, 2010, Wikimedia Commons, CC BY-SA 3.0.',
    creditUrl: 'https://commons.wikimedia.org/wiki/File:MIM_Mixtur-Trautonium_CN5834.jpg',
    hint: 'Press a wire down until it sounds, then slide.',
    body: [
      'The Trautonium has no keys. Its manual is a single wire stretched over a metal plate. Press the wire down onto the plate and you close a circuit, which makes a tone.',
      'Where you press sets the pitch, rising from left to right. A finger that slides along the wire makes a glide instead of a jump from note to note.',
      'On the classic manual the plate sits on springs, and how far you push it down sets the loudness. A wire that only rests on the plate makes no sound.',
      'The first instruments made their tone with neon-tube oscillators, which give a buzzing, sawtooth-like wave.'
    ],
    sources: [
      { label: 'Wikipedia, “Trautonium”', url: 'https://en.wikipedia.org/wiki/Trautonium' },
      { label: 'IEEE Spectrum, “How the Trautonium Found Favor With Nazis and Gave Hitchcock’s The Birds Its Distinctive Screech”', url: 'https://spectrum.ieee.org/how-the-trautonium-found-favor-with-nazis-and-gave-hitchcocks-emthe-birdsem-its-distinctive-screech' },
      { label: 'Doepfer, “The Trautonium Project”', url: 'https://doepfer.de/traut/traut_e.htm' }
    ]
  },
  {
    id: 'berlin',
    eyebrow: '20 June 1930',
    title: 'Berlin, 1930',
    image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Volkstrautonium_MIM.jpg?width=900',
    imageAlt: 'The Telefunken Volkstrautonium: a wooden box with a row of black knobs along the front.',
    credit: 'Telefunken Volkstrautonium, Berlin, 1933/34. Musikinstrumenten-Museum Berlin. Photo: Museumsinsulaner, 2009, Wikimedia Commons, public domain.',
    creditUrl: 'https://commons.wikimedia.org/wiki/File:Volkstrautonium_MIM.jpg',
    hint: 'Glide across a whole octave without lifting your finger.',
    body: [
      'Friedrich Trautwein built the Trautonium in 1930 at the Rundfunkversuchsstelle, the radio research lab of Berlin’s Hochschule für Musik.',
      'It was first played in public on 20 June 1930, at the festival Neue Musik Berlin 1930. Paul Hindemith wrote seven short trios for it, Des kleinen Elektromusikers Lieblinge, and played them with his student Oskar Sala and the pianist Rudolf Schmidt.',
      'From 1933 Telefunken sold a version for the home at 400 Reichsmarks. About 200 were made, and few sold.'
    ],
    sources: [
      { label: 'Wikipedia, “Trautonium”', url: 'https://en.wikipedia.org/wiki/Trautonium' },
      { label: 'IEEE Spectrum, “How the Trautonium Found Favor With Nazis and Gave Hitchcock’s The Birds Its Distinctive Screech”', url: 'https://spectrum.ieee.org/how-the-trautonium-found-favor-with-nazis-and-gave-hitchcocks-emthe-birdsem-its-distinctive-screech' },
      { label: 'Wikipedia, “Oskar Sala”', url: 'https://en.wikipedia.org/wiki/Oskar_Sala' }
    ]
  },
  {
    id: 'sala',
    eyebrow: '1910 to 2002',
    title: 'Oskar Sala',
    image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Oskar_Sala_-_1996_-_Photo_Peter_Pichler.jpg?width=900',
    imageAlt: 'Oskar Sala in 1996, standing in his studio in front of shelves and racks of equipment.',
    credit: 'Oskar Sala in his studio, 1996. Photo: Peter Pichler, Wikimedia Commons, CC BY 4.0.',
    creditUrl: 'https://commons.wikimedia.org/wiki/File:Oskar_Sala_-_1996_-_Photo_Peter_Pichler.jpg',
    hint: 'Hold one note steady for three seconds.',
    body: [
      'Oskar Sala was nineteen when he played at the premiere. He spent decades developing the instrument further.',
      'In 1952 he presented the Mixtur-Trautonium. Its oscillators add subharmonics, tones at a half, a third or a quarter of the main pitch, the mirror image of the overtone series. Sala used the word Mixtur for a combination of four of them over one main pitch.'
    ],
    reward: 'The Mixtur knob is now unlocked on the panel. Turn it up and the wire plays its main tone with three subharmonics under it.',
    sources: [
      { label: 'Wikipedia, “Oskar Sala”', url: 'https://en.wikipedia.org/wiki/Oskar_Sala' },
      { label: 'Wikipedia, “Trautonium”', url: 'https://en.wikipedia.org/wiki/Trautonium' },
      { label: 'Thom Holmes, “The Distinctive Electronic Music of Oskar Sala and the Mixtur-Trautonium, Part 1”', url: 'https://www.thomholmes.com/post/the-distinctive-electronic-music-of-oskar-sala-and-the-mixtur-trautonium-part-1' }
    ]
  },
  {
    id: 'birds',
    eyebrow: '1963',
    title: 'The Birds',
    image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Mixtur_Trautonium.jpg?width=900',
    imageAlt: 'A Mixtur-Trautonium behind glass: a wooden cabinet with rows of knobs, the manuals below them, and its valves in the open base.',
    credit: 'Mixtur-Trautonium, Deutsches Museum Bonn. Photo: Matthias Kabel, 2006, Wikimedia Commons, CC BY 2.5.',
    creditUrl: 'https://commons.wikimedia.org/wiki/File:Mixtur_Trautonium.jpg',
    hint: 'Turn up Mixtur, then make four fast swoops up high.',
    body: [
      'Alfred Hitchcock’s The Birds has no orchestral score. Hitchcock hired Oskar Sala and Remi Gassmann to make an electronic soundtrack, with Bernard Herrmann as sound consultant.',
      'Sala made the screeches and cries of the birds on the Mixtur-Trautonium, along with the slamming of doors and windows.'
    ],
    sources: [
      { label: 'IEEE Spectrum, “How the Trautonium Found Favor With Nazis and Gave Hitchcock’s The Birds Its Distinctive Screech”', url: 'https://spectrum.ieee.org/how-the-trautonium-found-favor-with-nazis-and-gave-hitchcocks-emthe-birdsem-its-distinctive-screech' },
      { label: 'Hitchcock Wiki, “Hitchcock Chronology: Oskar Sala”', url: 'https://hitchcockwiki.com/wiki/Hitchcock_Chronology:_Oskar_Sala' },
      { label: 'Thom Holmes, “The Distinctive Electronic Music of Oskar Sala and the Mixtur-Trautonium, Part 1”', url: 'https://www.thomholmes.com/post/the-distinctive-electronic-music-of-oskar-sala-and-the-mixtur-trautonium-part-1' }
    ]
  }
];

// The photo on the start screen: on a laptop it sits beside the title, on a phone it is a dim backdrop behind it.
window.ROOM = {
  image: 'https://commons.wikimedia.org/wiki/Special:FilePath/MIM_Mixtur-Trautonium_CN5834.jpg?width=900',
  imageAlt: 'A Mixtur-Trautonium: a wooden cabinet with a panel of knobs on top and two wire manuals sloping toward the player.',
  credit: 'Mixtur-Trautonium, Musikinstrumenten-Museum Berlin. Photo: Morn the Gorn, Wikimedia Commons, CC BY-SA 3.0',
  creditUrl: 'https://commons.wikimedia.org/wiki/File:MIM_Mixtur-Trautonium_CN5834.jpg'
};
