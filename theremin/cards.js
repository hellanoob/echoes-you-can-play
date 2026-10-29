/*
  Card text for the Theremin room.
  Edit titles, paragraphs and sources freely. Keep the four ids as they are:
  sketch.js unlocks each card by its id.

    air        unlocks after 1.5 seconds of sound you can hear
    petrograd  unlocks after one glide across a whole octave without the sound stopping
    rockmore   unlocks after holding one note in tune for 2 seconds (and unlocks the five octave range)
    spellbound unlocks after three swells with the volume hand

  Optional per card: image (a link or 'img/file.jpg'), imageAlt, credit ('What, where. Photo: who, year,
  where it's from, licence.') and creditUrl (the image's own page, which shows its licence).
  Every photo is from Wikimedia Commons, licence checked on its own page. If a photo fails to load,
  the card just leaves it out.
*/
window.CARDS = [
  {
    id: 'air',
    eyebrow: 'How it works',
    title: 'Play without touching',
    image: 'https://commons.wikimedia.org/wiki/Special:FilePath/RCA_Theremin_model_A-R_1264_circa_1930.jpg?width=900',
    imageAlt: 'An RCA theremin from about 1930: a wooden cabinet on four legs, the volume loop on the left and the upright pitch antenna on the right.',
    credit: 'RCA Theremin, model AR-1264, about 1930. Kunstmuseum Den Haag. Photo: WikiSander, 2022, Wikimedia Commons, CC BY-SA 4.0.',
    creditUrl: 'https://commons.wikimedia.org/wiki/File:RCA_Theremin_model_A-R_1264_circa_1930.jpg',
    hint: 'Raise your right hand in front of the camera until you hear it.',
    body: [
      'A theremin has two metal antennas and no keys. They are not radio antennas. Each one works as one plate of a capacitor, and the player’s hand is the other plate.',
      'Inside, two radio frequency oscillators run far above hearing. One is fixed, and the pitch antenna pulls the other. The instrument plays the difference between them, which lands in the range you can hear.',
      'Bring your hand closer to the upright antenna and the note goes up. The loop is the volume: move your hand away from it and the sound gets louder, lower it toward the loop and the sound fades.',
      'In this room a camera watches your hands instead. How big each hand looks stands in for how close it is: your right hand to the antenna, your left hand to the loop.'
    ],
    sources: [
      { label: 'Wikipedia, “Theremin”', url: 'https://en.wikipedia.org/wiki/Theremin' },
      { label: 'Lemelson-MIT, “Leon Theremin”', url: 'https://lemelson.mit.edu/resources/leon-theremin' }
    ]
  },
  {
    id: 'petrograd',
    eyebrow: '1920',
    title: 'Petrograd, 1920',
    image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Leon_Theremin_and_his_etherphone.jpg?width=900',
    imageAlt: 'A newspaper photo of Leon Theremin beside his instrument, its case opened to show the radio tubes inside.',
    credit: 'Leon Theremin with his instrument opened to show its radio tubes. The New York Times, January 29, 1928. Wikimedia Commons, public domain.',
    creditUrl: 'https://commons.wikimedia.org/wiki/File:Leon_Theremin_and_his_etherphone.jpg',
    hint: 'Glide across a whole octave without the sound stopping.',
    body: [
      'The theremin is named after its inventor, the Russian physicist Lev Sergeyevich Termen, known in the West as Leon Theremin. It grew out of Soviet government research into proximity sensors, and Wikipedia dates it to October 1920. Lemelson-MIT places his first prototype in Petrograd, now Saint Petersburg.',
      'He played it for Lenin in 1922, came to New York in December 1927, and patented it in the United States in 1928.',
      'RCA made and sold it under licence from 1929. It came out right after the stock market crash, and it was not a commercial success.'
    ],
    sources: [
      { label: 'Wikipedia, “Theremin”', url: 'https://en.wikipedia.org/wiki/Theremin' },
      { label: 'Lemelson-MIT, “Leon Theremin”', url: 'https://lemelson.mit.edu/resources/leon-theremin' },
      { label: 'Wikipedia, “Leon Theremin”', url: 'https://en.wikipedia.org/wiki/Leon_Theremin' }
    ]
  },
  {
    id: 'rockmore',
    eyebrow: '1911 to 1998',
    title: 'Clara Rockmore',
    image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Clara_Rockmore_(1911-1998)_at_her_Theremin.jpg?width=900',
    imageAlt: 'Clara Rockmore in a long gown, standing at her theremin, her right hand raised toward the pitch antenna and her left hand over the cabinet.',
    credit: 'Clara Rockmore at her theremin, 1932. Photo: Renato Toppo, Wikimedia Commons, public domain.',
    creditUrl: 'https://commons.wikimedia.org/wiki/File:Clara_Rockmore_(1911-1998)_at_her_Theremin.jpg',
    hint: 'Hold one note in tune for two seconds. Watch the needle.',
    body: [
      'Clara Rockmore was born in Vilnius in 1911. She started as a violin prodigy, the youngest student ever at the Saint Petersburg Conservatory, where she studied with Leopold Auer. As a teenager she developed tendinitis in her bow arm and had to give up the violin.',
      'In America she met Leon Theremin and became the instrument’s best known player. She worked out a fingering system that let her play fast passages and wide leaps cleanly, without the slide between notes most players had.',
      'She also worked with Theremin to change the instrument itself: a more sensitive volume control for quick, separated notes, a more sensitive pitch antenna, and a range stretched from three octaves to five.',
      'In 1977 Bob and Shirleigh Moog produced her album The Art of the Theremin, with her sister Nadia on piano. She said a thereminist has to “play the rests, as well as the notes”.'
    ],
    reward: 'The range switch on the cabinet now goes to five octaves, as on the instrument Theremin changed for her.',
    sources: [
      { label: 'Wikipedia, “Clara Rockmore”', url: 'https://en.wikipedia.org/wiki/Clara_Rockmore' },
      { label: 'Wikipedia, “Theremin”', url: 'https://en.wikipedia.org/wiki/Theremin' }
    ]
  },
  {
    id: 'spellbound',
    eyebrow: '1945',
    title: 'Spellbound, 1945',
    image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Etherwave_Theremin_Kit.jpg?width=900',
    imageAlt: 'A small Moog Etherwave theremin: a wooden box with four knobs, a loop antenna on the left and a straight antenna on the right.',
    credit: 'Moog Etherwave theremin, built from a Moog kit. Photo: Hutschi, 2005, Wikimedia Commons, CC BY-SA 3.0.',
    creditUrl: 'https://commons.wikimedia.org/wiki/File:Etherwave_Theremin_Kit.jpg',
    hint: 'Bring your left hand close to go quiet, then pull it back to swell. Three times.',
    body: [
      'Samuel Hoffman was a podiatrist in Los Angeles who played the theremin on the side. When Miklós Rózsa wanted one in his score for Alfred Hitchcock’s Spellbound, he called Hoffman, the only thereminist in the union register who could read music.',
      'The score won the Academy Award for Best Original Score. The same year Hoffman played on Rózsa’s score for The Lost Weekend, and over the next decade on science fiction films such as The Day the Earth Stood Still (1951). His 1947 album with Les Baxter and Harry Revel, Music Out of the Moon, is often called the best selling theremin record ever.',
      'The Beach Boys’ Good Vibrations is often credited with a theremin. It doesn’t have one: it uses the Electro-Theremin, a different instrument built by Paul Tanner.',
      'In the 1950s a high school student named Robert Moog built theremins and sold kits for them. He said that work led him straight to the synthesizer.'
    ],
    sources: [
      { label: 'Wikipedia, “Samuel Hoffman”', url: 'https://en.wikipedia.org/wiki/Samuel_Hoffman' },
      { label: 'Wikipedia, “Theremin”', url: 'https://en.wikipedia.org/wiki/Theremin' }
    ]
  }
];

// The photo on the start screen (on a laptop; a phone on its side leaves it out for space).
window.ROOM = {
  image: 'https://commons.wikimedia.org/wiki/Special:FilePath/RCA_Theremin_model_A-R_1264_circa_1930.jpg?width=900',
  imageAlt: 'An RCA theremin from about 1930: a wooden cabinet on four legs with a loop antenna and an upright antenna.',
  credit: 'RCA Theremin, about 1930, Kunstmuseum Den Haag. Photo: WikiSander, Wikimedia Commons, CC BY-SA 4.0',
  creditUrl: 'https://commons.wikimedia.org/wiki/File:RCA_Theremin_model_A-R_1264_circa_1930.jpg'
};
