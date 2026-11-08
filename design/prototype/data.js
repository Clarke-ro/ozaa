// Cravins v5 sample data. In production this comes from the venue's settings in the owner dashboard.
// Every service a venue can switch on. Grouped into sections on the guest home.
window.SERVICE_SECTIONS = [
  { id: 'table', title: 'At your table' },
  { id: 'rewards', title: 'Rewards' },
  { id: 'fun', title: 'Fun while you wait' },
  { id: 'more', title: 'More' },
];
window.SERVICES = {
  menu:     { sec: 'table',   icon: 'book',     t: 'Menu',               s: 'Food and drinks, order from your table' },
  waiter:   { sec: 'table',   icon: 'bell',     t: 'Call waiter',        s: 'Water, the bill or a hand' },
  status:   { sec: 'table',   icon: 'clock',    t: 'Order status',       s: 'See where your food is' },
  pay:      { sec: 'table',   icon: 'card',     t: 'Pay & split bill',   s: 'MoMo or card, split any way' },
  wifi:     { sec: 'table',   icon: 'wifi',     t: 'Wi-Fi',              s: 'Connect in one tap' },
  loyalty:  { sec: 'rewards', icon: 'gift',     t: 'Loyalty card',       s: 'Collect stamps, get free food' },
  offers:   { sec: 'rewards', icon: 'tag',      t: 'Specials & offers',  s: "Today's deals" },
  review:   { sec: 'rewards', icon: 'star',     t: 'Leave a review',     s: 'Write one or record a short video' },
  play:     { sec: 'fun',     icon: 'game',     t: 'Play while you wait', s: 'A quick game. Beat the top score here' },
  reserve:  { sec: 'more',    icon: 'calendar', t: 'Reserve a table',    s: 'Book your next visit' },
  events:   { sec: 'more',    icon: 'party',    t: 'Events',             s: 'Live music, quiz nights and more' },
  feedback: { sec: 'more',    icon: 'flag',     t: 'Feedback & complaints', s: 'Tell the manager in private' },
  about:    { sec: 'more',    icon: 'info',     t: 'About & contact',    s: 'Hours, map, phone and WhatsApp' },
};
// Per venue: which services are on, plus the details each feature needs.
const EXTRA = {
  mamas: {
    services: ['menu','waiter','status','pay','wifi','loyalty','offers','review','play','reserve','events','feedback','about'],
    offerNote: '2 deals today', table: '12',
    wifi: { ssid: 'MamasKitchen-Guest', pass: 'jollof2026', sec: 'WPA' },
    loyalty: { have: 5, need: 8, reward: 'Free jollof & chicken', member: 'Since March 2026' },
    game: { stampReward: true, stampScore: 15 },
    stories: [
      { id: 'ama',  name: 'Ama',  stars: 5, ago: '2 days ago', dish: 0, video: 'media/review-ama.mp4', poster: 'img/story-ama.jpg', av: 'img/av-ama.jpg', quote: 'Best jollof in Osu. The smoky flavour is real!' },
      { id: 'kofi', name: 'Kofi', stars: 5, ago: '3 days ago', dish: 2, poster: 'img/story-kofi.jpg', av: 'img/av-kofi.jpg', quote: 'Tilapia was fresh and the pepper hits.' },
      { id: 'efua', name: 'Efua', stars: 4, ago: '5 days ago', dish: 1, poster: 'img/story-efua.jpg', av: 'img/av-efua.jpg', quote: 'Big waakye portion, good price.' },
      { id: 'yaw',  name: 'Yaw',  stars: 5, ago: '1 week ago', dish: 3, poster: 'img/story-yaw.jpg', av: 'img/av-yaw.jpg', quote: 'Came for kelewele, stayed for sobolo.' },
      { id: 'akua', name: 'Akua', stars: 4, ago: '1 week ago', dish: 4, poster: 'img/story-akua.jpg', av: 'img/av-akua.jpg', quote: 'Lovely staff, quick service.' },
    ],
  },
  bean: {
    services: ['menu','waiter','status','pay','wifi','loyalty','review','play','about'],
    table: '4',
    wifi: { ssid: 'BeanThere-Work', pass: 'flatwhite88', sec: 'WPA' },
    loyalty: { have: 3, need: 10, reward: 'Free flat white', member: 'Since June 2026' },
    game: { stampReward: false, stampScore: 15 },
    stories: [
      { id: 'efua', name: 'Efua', stars: 5, ago: 'Yesterday', dish: 0, poster: 'img/story-efua.jpg', av: 'img/av-efua.jpg', quote: 'Great spot to work. Strong coffee.' },
      { id: 'yaw',  name: 'Yaw',  stars: 4, ago: '4 days ago', dish: 2, poster: 'img/story-yaw.jpg', av: 'img/av-yaw.jpg', quote: 'Sobolo cold brew is a must.' },
      { id: 'akua', name: 'Akua', stars: 5, ago: '1 week ago', dish: 1, poster: 'img/story-akua.jpg', av: 'img/av-akua.jpg', quote: 'Meat pie was warm and flaky.' },
    ],
  },
  akos: {
    services: ['menu','waiter','status','pay','review','play','about'],
    table: '7',
    wifi: { ssid: 'AuntieAkos', pass: 'fufu1234', sec: 'WPA' },
    loyalty: { have: 2, need: 6, reward: 'Free fufu & light soup', member: 'Since August 2026' },
    game: { stampReward: true, stampScore: 20 },
    stories: [
      { id: 'kofi', name: 'Kofi', stars: 5, ago: '2 days ago', dish: 0, poster: 'img/story-kofi.jpg', av: 'img/av-kofi.jpg', quote: 'Fufu pounded right in front of you.' },
    ],
  },
};
for (const k in EXTRA) Object.assign(window.VENUES[k], EXTRA[k]);
// Sample order for this table (in production: live from the kitchen screen).
window.ORDER = { no: 24, placed: '12:41', eta: 12, step: 1, items: [ { i: 0, q: 1 }, { i: 4, q: 2 } ] };
