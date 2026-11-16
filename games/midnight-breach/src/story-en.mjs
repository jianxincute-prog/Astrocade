// English version of the story. Same ids and structure as story-id.mjs.
// All names, messages, portraits and "scandals" in this found-phone story are fictional.
export const CONTACTS = [
  { id: 'rani', name: 'Rani Putri', initials: 'RP', tint: 'coral', label: 'College friend', status: 'Last seen: unknown' },
  { id: 'dimas', name: 'Dimas Arta', initials: 'DA', tint: 'blue', label: 'Bandmate', status: 'Active yesterday' },
  { id: 'laras', name: 'Big Sis Laras', initials: 'BL', tint: 'gold', label: 'Sister • family', status: 'Active 2 hours ago' },
  { id: 'hendra', name: 'Uncle Hendra', initials: 'UH', tint: 'blue', label: 'Uncle • family', status: 'Typing…' },
  { id: 'wati', name: 'Mrs. Wati', initials: 'MW', tint: 'coral', label: 'Neighbor across the street', status: 'Last seen 23:39' },
  { id: 'darto', name: 'Mr. Darto', initials: 'MD', tint: 'gold', label: 'Next-door neighbor', status: 'Inactive' },
  { id: 'sari', name: 'Mrs. Sari', initials: 'MS', tint: 'gold', label: 'Corner shop owner', status: 'Open late' },
  { id: 'nara', name: 'Nara Aster', initials: 'NA', tint: 'violet', label: 'Singer • business contact', status: 'Last seen 23:58', business: true },
  { id: 'bima', name: 'Bima Satya', initials: 'BS', tint: 'violet', label: 'Actor • business contact', status: 'Inactive', business: true },
  { id: 'jessa', name: 'Jessa Moon', initials: 'JM', tint: 'coral', label: 'Influencer • business contact', status: 'Live 1 hour ago', business: true },
];

export const THREADS = [
  { id: 'rani', name: 'Rani Putri', initials: 'RP', tint: 'coral', preview: "I'll explain later.", time: '23:41', messages: [
    ['them', 'Do you still have the ticket I left with you?'], ['me', 'The one from the old station?'], ['them', "Yes. Don't throw it away yet."], ['them', "I'll explain later."], ['them', 'This message has not been sent.'],
  ] },
  { id: 'hendra', name: 'Uncle Hendra', initials: 'UH', tint: 'blue', preview: "Don't zoom in on Uncle's gym photo", time: '23:12', messages: [
    ['them', "Uncle's photo in the family group looks great, right? Six months at the gym 💪"], ['me', 'Is that barbell made of cardboard, Uncle?'], ['them', "Don't zoom in."], ['them', "Auntie doesn't know."],
  ] },
  { id: 'wati', name: 'Mrs. Wati', initials: 'MW', tint: 'coral', preview: 'Dear, did you come to my house again?', time: '21:05', messages: [
    ['them', 'Dear, did you come to my house again?'], ['me', 'Sorry, ma\'am?'], ['them', "You asked about someone named Rani. I don't know her."], ['them', 'You said it was the 7th time.'],
  ] },
  { id: 'unknown', name: 'Unknown number', initials: '?', tint: 'violet', preview: "AT 00:00 — DON'T LOOK AT THE CAMERA.", time: '23:47', messages: [
    ['them', 'AFTER keeps what you want to forget.'], ['them', "Rani isn't missing. She's been stored."], ['them', "At 00:00 — DON'T LOOK AT THE CAMERA."],
  ] },
];

export const NOTES = [
  { title: 'Shopping list', date: 'Today', body: "Jasmine tea\nAA batteries\nMartabak for Uncle Hendra (secret)" },
  { title: 'Neighborhood gossip', date: 'Yesterday', body: "Why is there karaoke at Mrs. Wati's house at 1 AM?\nWhy are the mangoes on our tree gone again?" },
  { title: 'Untitled note', date: '23:49', body: "Rani hasn't replied since the afternoon.\nThe AFTER app is on my phone, but I don't remember installing it." },
];

// Seven clues in three acts. Act 1 (own house): tiket, ketukan, resi. Act 2 (the complex): surat,
// cctv, ronda, warung. Act 3: Rani's old house at the west end, opened once 5 clues are found.
export const CLUES = [
  { id: 'tiket', act: 1, from: 'rani-file', place: 'Study desk · Bedroom',
    teaser: "Rani left something with you. The ticket may still be on your study desk.",
    title: 'One-way ticket',
    text: 'On the back of the ticket, in your own handwriting: "Rani didn\'t disappear. I erased her." Below it is an address: "Block C-7, west end of the complex".',
    note: { title: 'Writing on the ticket', date: 'Ticket', body: "Rani didn't disappear.\nI erased her.\nAddress: Block C-7,\nwest end of the complex." } },
  { id: 'ketukan', act: 1, from: 'dimas-file', place: 'Old cabinet · Living room',
    teaser: 'Three knocks at the end of the song. The old cabinet in the living room knocks back three times.',
    title: 'Tape in the old cabinet',
    text: 'Behind a panel in the cabinet is a small cassette. Rani\'s voice: "If you hear this, don\'t install AFTER again. I\'m still at my old house, where we used to sit."',
    note: { title: "Rani's tape", date: 'Old cabinet', body: '"Don\'t install AFTER again.\nI\'m still at my old house."\nThe voice was Rani\'s.' } },
  { id: 'resi', act: 1, from: 'laras-file', place: 'Fridge · Kitchen',
    teaser: 'Big Sis Laras hid the receipts under the kitchen counter. Try checking the fridge.',
    title: 'Sticker on the fridge',
    text: 'A yellow sticker on the fridge door, in your handwriting: "Attempt #7. AFTER installed at 23:47 from your own phone. Same every night. Don\'t forget Block C-7."',
    note: { title: 'Fridge sticker', date: 'Kitchen', body: 'Attempt #7.\nAFTER installed at 23:47\nfrom my own phone.\nDon\'t forget Block C-7.' } },
  { id: 'surat', act: 2, from: 'wati-file', place: 'Mailbox · Front yard',
    teaser: 'Mrs. Wati often watches from her window. Check the mailbox in the yard.',
    title: "Mrs. Wati's letter",
    text: 'A letter from Mrs. Wati: "Dear, every midnight you walk to the empty house at the west end, crying. I don\'t know who Rani is, but her photo is on that house\'s fence."',
    note: { title: "Mrs. Wati's letter", date: 'Mailbox', body: 'Every midnight you walk\nto the empty house at the\nwest end, crying.' } },
  { id: 'cctv', act: 2, from: 'darto-file', place: "CCTV monitor · Mr. Darto's porch",
    teaser: "Mr. Darto's CCTV records the complex street at dawn. The screen is on his porch.",
    title: 'CCTV footage 05:12',
    text: 'Dawn footage: you walk out of the empty house at Block C-7 carrying a small suitcase, then go home empty-handed. Every dawn, exactly the same.',
    note: { title: 'Footage 05:12', date: 'CCTV', body: 'You walk out of the empty\nhouse at Block C-7 with a\nsmall suitcase, then go\nhome empty-handed.' } },
  { id: 'ronda', act: 2, from: 'hendra-file', place: 'Watch log · Night watch post',
    teaser: "Uncle Hendra loves the Thursday-night watch. His logbook is at the watch post.",
    title: 'Night watch logbook',
    text: 'Watch log: "00:07 young man from Block A passed by carrying a suitcase to empty house C-7. 00:41 returned, crying. Six nights in a row."',
    note: { title: 'Watch logbook', date: 'Watch post', body: '00:07 carrying a suitcase to\nempty house C-7.\n00:41 back, crying.\nSix nights in a row.' } },
  { id: 'warung', act: 2, from: 'sari-file', place: 'Receipt · Corner shop',
    teaser: "Mrs. Sari keeps receipts for her regulars. Check the counter at the corner shop by the junction.",
    title: 'Corner shop receipt',
    text: 'Regular\'s receipt: "2 jasmine teas, every night." Mrs. Sari says: you drink one, and leave the other on the bench in front of the empty house. "For a friend," you said.',
    note: { title: 'Shop receipt', date: 'Corner shop', body: '2 jasmine teas every night.\nOne is left on the bench\nin front of the empty house.\n"For a friend."' } },
];

// Display names for AFTER's filter chips and category labels.
export const CATEGORY_NAMES = { all: 'ALL', friend: 'FRIENDS', family: 'FAMILY', neighbor: 'NEIGHBORS', celeb: 'CELEBRITIES', unknown: 'UNKNOWN' };

export const ARCHIVE = [
  { id: 'rani-file', category: 'friend', name: 'The audition "final"', person: 'Rani Putri · college friend', time: '23:41', scene: 'aib_rani', label: 'VIDEO • 00:47', clue: 'tiket',
    description: 'Rani claims she made the singing audition final. The original footage: she slipped on stage during a high note, and the judges hit the red buzzer three times. Today she went missing without a word.' },
  { id: 'dimas-file', category: 'friend', name: 'Demo track 4', person: 'Dimas Arta · bandmate', time: '22:16', scene: 'aib_dimas', label: 'AUDIO • 03:13', clue: 'ketukan',
    description: 'The band\'s "toughest" guitarist turns out to write mellow love songs for his cat, Mochi. At the end of the song you can hear three knocks that are not in the score.' },
  { id: 'laras-file', category: 'family', name: 'Home cooking, 40k followers', person: 'Big Sis Laras · sister', time: '19:20', scene: 'aib_laras', label: 'PHOTO • KITCHEN', clue: 'resi',
    description: 'Laras\'s recipe account went viral for "cooking everything herself, every day". Under the kitchen counter: a pile of delivery bags she had no time to hide.' },
  { id: 'hendra-file', category: 'family', name: 'Six months at the gym', person: 'Uncle Hendra · uncle', time: '23:12', scene: 'aib_hendra', label: 'PHOTO • UNEDITED', clue: 'ronda',
    description: 'The "gym results" photo in the family group was taken in the living room. The barbell is cardboard painted black, and a sweet martabak waits on the table beside it. Uncle Hendra also loves the Thursday-night watch and logs everyone who passes.' },
  { id: 'wati-file', category: 'neighbor', name: 'Midnight concert', person: 'Mrs. Wati · neighbor across the street', time: '01:04', scene: 'aib_wati', label: 'VIDEO • WINDOW', clue: 'surat',
    description: 'The neighbor who complains most about noise does rock karaoke every Saturday night, disco lights included. From her window she can also see your entire yard.' },
  { id: 'darto-file', category: 'neighbor', name: 'The missing mango mystery', person: 'Mr. Darto · next-door neighbor', time: '05:12', scene: 'aib_darto', label: 'CCTV • DAWN', clue: 'cctv',
    description: 'For three months the mangoes in the yard kept vanishing. Dawn CCTV caught Mr. Darto on a folding ladder, sarong tied around his head, carrying a bucket. His camera also covers the complex street.' },
  { id: 'sari-file', category: 'neighbor', name: '"Two thousand" tea', person: 'Mrs. Sari · corner shop owner', time: '22:50', scene: 'aib_sari', label: 'PHOTO • SHOP', clue: 'warung',
    description: 'Mrs. Sari says tea at her shop is "still two thousand, like always". This receipt proves it\'s five thousand. The same receipt logs one loyal customer who orders two jasmine teas every night.' },
  { id: 'nara-file', category: 'celeb', name: 'Lip-sync scandal', person: 'Nara Aster · singer', time: '23:58', scene: 'aib_nara', label: 'BACKSTAGE • EXCLUSIVE',
    description: 'Nara\'s "100% live" concert. A backstage camera caught the crew pressing play, while Nara\'s microphone turned out not to be plugged in.' },
  { id: 'bima-file', category: 'celeb', name: 'Action hero afraid of lizards', person: 'Bima Satya · action actor', time: '23:59', scene: 'aib_bima', label: 'PHOTO • ON SET',
    description: 'The action star who "does all his own stunts" stands on a chair screaming because of a tiny gecko. His stunt double laughs behind him.' },
  { id: 'jessa-file', category: 'celeb', name: '"Bali" vacation in a parking lot', person: 'Jessa Moon · influencer', time: '22:40', scene: 'aib_jessa', label: 'PHOTO • BEHIND THE SCENES',
    description: 'Jessa\'s luxury beach vacation photo was actually shot on a mall parking-lot roof: green cloth, a desk fan, sand in a basin, and a plastic coconut tree.' },
  { id: 'breach-01', category: 'unknown', name: 'Silhouette behind the glass', person: 'Unknown source', time: '00:00', scene: 'hall', label: 'SOURCE: NOT FOUND',
    description: 'The reflection in the window is closer than the room behind the camera. Its shape is too tall to be human. Or it is your own shadow, which has already forgotten.' },
  { id: 'breach-02', category: 'unknown', name: 'Sky with eyes', person: 'Unknown source', time: '00:01', scene: 'eye', label: 'ORIENTATION: IMPOSSIBLE',
    description: 'The clouds open into a shape like an eye. The metadata says the camera was facing the ceiling.' },
  { id: 'breach-04', category: 'unknown', name: 'Her, in every corner', person: 'Unknown source', time: '00:04', scene: 'watch', label: 'FOUND IN 10 PLACES',
    description: 'The same photo hangs in every corner of your house. In each frame the figure is a little closer, and its eyes always follow you.' },
  { id: 'breach-03', category: 'unknown', name: 'Corridor with no corners', person: 'Unknown source', time: '00:03', scene: 'corridor', label: 'LOCATION: EMPTY',
    description: 'All the perspective lines end at the same place. There is no building at the saved address.' },
];

// Final confrontation with Rani in her old house at the west end of the complex.
export const FINALE = [
  { who: 'Rani', text: "You finally made it to my house. This is the seventh time." },
  { who: 'Rani', text: "AFTER isn't a search app. It's an app that keeps what you want to forget." },
  { who: 'Rani', text: 'That night we argued. You told me to go, then regretted it, then installed AFTER to erase the regret.' },
  { who: 'Rani', text: "AFTER erased your regret, and I was erased with it. To everyone else, this house is empty. The three knocks were me. The silhouette in the glass is your own shadow, which has forgotten." },
  { who: 'Rani', text: "Now choose. Delete AFTER, and I come back, but you forget everything again. Or keep it, and you remember, but I stay here." },
];
export const ENDINGS = {
  delete: { title: 'AFTER deleted', text: "The lights in Rani's house come on for the first time in ages. She opens the door holding the same ticket. You don't remember why your eyes are wet. On your phone there's only one small note: \"Don't install AFTER again.\"" },
  keep: { title: 'AFTER kept', text: "You remember everything. Rani smiles from behind the door of a house that never opens for anyone else, and you promise to find another way. At the next midnight, AFTER receives one new file: your name." },
};

// Neighbours you can talk to outside. Lines change once a related clue has been found.
export const NPC = {
  wati: {
    label: 'Mrs. Wati',
    lines: [
      { who: 'Mrs. Wati', text: "Dear, still out this late? Yesterday you asked about someone named Rani. I don't know her." },
      { who: 'Mrs. Wati', text: 'You said it was the 7th time. That empty house at the west end gives me chills too.' },
    ],
    afterClue: 'surat',
    afterLines: [
      { who: 'Mrs. Wati', text: "Did you read my letter, dear? If you go to that house again, don't cry alone." },
    ],
  },
  darto: {
    label: 'Mr. Darto',
    lines: [
      { who: 'Mr. Darto', text: 'My mangoes vanished again. It wasn\'t you, was it, son?' },
      { who: 'Mr. Darto', text: 'Oh, right, my camera covers the complex street all the way to the west end. I put the screen on my porch.' },
    ],
    afterClue: 'cctv',
    afterLines: [
      { who: 'Mr. Darto', text: "Seen the footage? Sorry, I don't know what that little suitcase was for, taking it to the empty house." },
    ],
  },
};

// What the framed photo says when inspected, by how close the figure has crept.
export const PHOTO_LINES = [
  'An old photo: someone standing far away at the end of a corridor. Their face is hidden.',
  'The person in the photo looks a little closer than before.',
  "The figure is close now. I don't remember hanging this photo.",
  'Its eyes follow me wherever I move. On the back of the frame: "I\'m in every corner."',
  'Its face almost fills the photo. It is staring straight at me.',
];
