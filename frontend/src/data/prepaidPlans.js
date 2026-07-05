// src/data/prepaidPlans.js

// Categories:
// "News", "Entertainment", "Movies", "Sports", "Kids", "Educational", 
// "Religious", "Shopping", "Radio", "Others"

// ------------------------------------------------------------
// BASE CHANNELS (Load 200)
// ------------------------------------------------------------
const base200 = [
  // Free-to-air / General
  { name: "PTV", category: "News" },
  { name: "TV5", category: "Entertainment" },
  { name: "One Sports", category: "Sports" },
  { name: "GMA", category: "Entertainment" },
  { name: "GTV", category: "Entertainment" },
  { name: "CNN Philippines", category: "News" },
  { name: "IBC 13", category: "Entertainment" },
  { name: "Net 25", category: "Entertainment" },
  { name: "A2Z", category: "Entertainment" },
  { name: "Solar Flix", category: "Movies" },
  { name: "RJTV", category: "Entertainment" },
  { name: "ALL TV", category: "Entertainment" },

  // Movies / Series
  { name: "Tap Movies", category: "Movies" },
  { name: "Thrill", category: "Movies" },
  { name: "Paramount Network", category: "Movies" },
  { name: "HITS Movies", category: "Movies" },

  // Pinoy / Variety
  { name: "BuKo", category: "Entertainment" },
  { name: "Sari-Sari Channel", category: "Entertainment" },
  { name: "Kapamilya Channel", category: "Entertainment" },
  { name: "Celestial Movies Pinoy", category: "Movies" },
  { name: "Pinoy Box Office", category: "Movies" },
  { name: "Viva Cinema", category: "Movies" },
  { name: "Cinemo", category: "Movies" },
  { name: "Jeepney TV", category: "Entertainment" },
  { name: "Tagalized Movie Channel", category: "Movies" },

  // News / Public Affairs
  { name: "One PH", category: "News" },
  { name: "One News", category: "News" },
  { name: "One News HD", category: "News" },
  { name: "DZRH News TV", category: "News" },
  { name: "Al Jazeera TV", category: "News" },

  // General Entertainment
  { name: "Rock Entertainment", category: "Entertainment" },
  { name: "AXN", category: "Entertainment" },
  { name: "Rock Extreme", category: "Entertainment" },
  { name: "Lifetime", category: "Entertainment" },
  { name: "TAP TV", category: "Entertainment" },
  { name: "Telenovela Channel", category: "Entertainment" },
  { name: "Lotus Macau", category: "Entertainment" },
  { name: "KIX HD", category: "Entertainment" },
  { name: "Warner TV HD", category: "Entertainment" },
  { name: "HITS HD", category: "Entertainment" },

  // Educational / Documentary
  { name: "Knowledge Channel", category: "Educational" },
  { name: "DepEd TV", category: "Educational" },
  { name: "BBC Earth HD", category: "Educational" },
  { name: "TVUP", category: "Educational" },
  { name: "Outdoor Channel", category: "Educational" },

  // Local / Regional / Others
  { name: "Xtreme Pinoy", category: "Others" },
  { name: "Horse Racing", category: "Sports" },
  { name: "CLTV36", category: "Others" },

  // Religious
  { name: "Word of God", category: "Religious" },
  { name: "INC TV", category: "Religious" },
  { name: "EWTN", category: "Religious" },
  { name: "UNTV", category: "Religious" },
  { name: "Light TV 33", category: "Religious" },
  { name: "GCTV", category: "Religious" },
  { name: "Sonshine TV", category: "Religious" },
  { name: "TV Maria", category: "Religious" },

  // Shopping
  { name: "TV Shop Philippines", category: "Shopping" },

  // Radio
  { name: "DZRH AM", category: "Radio" },
  { name: "90.7 Love Radio", category: "Radio" },
  { name: "101.1 Yes FM", category: "Radio" },
  { name: "89.9 Magic", category: "Radio" },
  { name: "99.5 Play FM", category: "Radio" },
  { name: "92.3 News FM", category: "Radio" },
  { name: "GV FM (Angeles)", category: "Radio" },
  { name: "102.7 Star FM", category: "Radio" },
  { name: "93.9 iFM", category: "Radio" },
  { name: "DZXL 558 AM", category: "Radio" },
  { name: "93.1 RX FM", category: "Radio" },
  { name: "Catholic Media Network", category: "Radio" },
  { name: "Edge Radio", category: "Radio" },
  { name: "Radio Veritas 846", category: "Radio" },
  { name: "98.7 DZFE", category: "Radio" },
  { name: "Radio Maria", category: "Radio" },
  { name: "104.3 FM", category: "Radio" },
  { name: "FMR", category: "Radio" },
];

// ------------------------------------------------------------
// EXTRA CHANNELS PER LOAD
// ------------------------------------------------------------

// LOAD 300 EXTRA
const load300Extra = [
  { name: "Cartoon Network", category: "Kids" },
  { name: "Boomerang", category: "Kids" },
  { name: "Nickelodeon", category: "Kids" },
  { name: "Animal Planet", category: "Educational" },
  { name: "Discovery Channel", category: "Educational" },
  { name: "Nat Geo", category: "Educational" },
  { name: "History Channel", category: "Educational" },
  { name: "NBA TV", category: "Sports" },
  { name: "EuroSport", category: "Sports" },
  { name: "Crime + Investigation", category: "Entertainment" },
  { name: "KBS World", category: "Entertainment" },
  { name: "Asian Food Network", category: "Entertainment" },
];

// LOAD 450 EXTRA
const load450Extra = [
  { name: "HBO", category: "Movies" },
  { name: "HBO Family", category: "Movies" },
  { name: "HBO Hits", category: "Movies" },
  { name: "HBO Signature", category: "Movies" },
  { name: "Cinemax", category: "Movies" },
  { name: "Animax", category: "Kids" },
  { name: "Nick Jr.", category: "Kids" },
  { name: "Disney Channel", category: "Kids" },
  { name: "Disney Junior", category: "Kids" },
  { name: "Cartoonito", category: "Kids" },
  { name: "Fox News", category: "News" },
  { name: "Bloomberg", category: "News" },
  { name: "TLC", category: "Entertainment" },
  { name: "Discovery Asia", category: "Educational" },
  { name: "TAP Sports", category: "Sports" },
  { name: "Premier Football", category: "Sports" },
  { name: "HGTV", category: "Entertainment" },
  { name: "Food Network", category: "Entertainment" },
];

// LOAD 500 EXTRA
const load500Extra = [
  { name: "HBO HD", category: "Movies" },
  { name: "HBO Family HD", category: "Movies" },
  { name: "Cinemax HD", category: "Movies" },
  { name: "Sony Channel", category: "Entertainment" },
  { name: "AXN HD", category: "Entertainment" },
  { name: "Universal Channel", category: "Entertainment" },
  { name: "Comedy Central", category: "Entertainment" },
  { name: "MTV", category: "Entertainment" },
  { name: "Discovery HD", category: "Educational" },
  { name: "Nat Geo Wild", category: "Educational" },
  { name: "National Geographic HD", category: "Educational" },
  { name: "Fox Sports", category: "Sports" },
  { name: "TAP Sports HD", category: "Sports" },
  { name: "KIX", category: "Entertainment" },
];

// LOAD 600 EXTRA
const load600Extra = [
  { name: "HITS", category: "Entertainment" },
  { name: "HITS Now", category: "Entertainment" },
  { name: "ROCK Action", category: "Entertainment" },
  { name: "Lifetime HD", category: "Entertainment" },
  { name: "Warner TV", category: "Entertainment" },
  { name: "TAP Movies HD", category: "Movies" },
  { name: "TAP Action Flix", category: "Movies" },
  { name: "TAP Mystery", category: "Movies" },
  { name: "History HD", category: "Educational" },
  { name: "Metro Channel", category: "Entertainment" },
  { name: "Asianovela Channel", category: "Entertainment" },
  { name: "NickToons", category: "Kids" },
  { name: "MTV Live", category: "Entertainment" },
  { name: "Premier Sports", category: "Sports" },
  { name: "Premier Sports 2", category: "Sports" },
];

// LOAD 800 EXTRA
const load800Extra = [
  { name: "Paramount Network HD", category: "Entertainment" },
  { name: "Discovery Turbo", category: "Educational" },
  { name: "Outdoor Channel HD", category: "Educational" },
  { name: "CNN International", category: "News" },
  { name: "BBC News", category: "News" },
  { name: "Cartoon Network HD", category: "Kids" },
  { name: "Nickelodeon HD", category: "Kids" },
  { name: "Animax HD", category: "Kids" },
  { name: "HBO Go Access", category: "Movies" },
  { name: "Thrill HD", category: "Movies" },
  { name: "Korean Dramas HD", category: "Entertainment" },
  { name: "AXN Asia HD", category: "Entertainment" },
  { name: "NBA TV HD", category: "Sports" },
  { name: "TAP Sports 2 HD", category: "Sports" },
  { name: "Golf Channel", category: "Sports" },
];

// LOAD 1000 EXTRA
const load1000Extra = [
  { name: "HBO Hits HD", category: "Movies" },
  { name: "Cinemax HD", category: "Movies" },
  { name: "FOX Movies", category: "Movies" },
  { name: "FOX Action Movies", category: "Movies" },
  { name: "KIX HD", category: "Entertainment" },
  { name: "AXN HD", category: "Entertainment" },
  { name: "Discovery Channel HD", category: "Educational" },
  { name: "Nat Geo HD", category: "Educational" },
  { name: "Nat Geo Wild HD", category: "Educational" },
  { name: "BBC Earth HD", category: "Educational" },
  { name: "History HD", category: "Educational" },
  { name: "MTV HD", category: "Entertainment" },
  { name: "Animax HD", category: "Kids" },
  { name: "Nickelodeon HD", category: "Kids" },
  { name: "Disney Channel HD", category: "Kids" },
  { name: "NBA Premium HD", category: "Sports" },
  { name: "Premier Sports HD", category: "Sports" },
  { name: "Fight Sports HD", category: "Sports" },
  { name: "BeIN Sports", category: "Sports" },
  { name: "Golf Channel HD", category: "Sports" },
];

// ------------------------------------------------------------
// FINAL EXPORT (MERGED AUTOMATICALLY)
// ------------------------------------------------------------
export const prepaidPlans = {
  "200": {
    id: "200",
    name: "Load 200",
    amount: 200,
    description: "Balanced value and duration.",
    channels: base200,
  },

  "300": {
    id: "300",
    name: "Load 300",
    amount: 300,
    description: "More entertainment and documentary channels.",
    channels: [...base200, ...load300Extra],
  },

  "450": {
    id: "450",
    name: "Load 450",
    amount: 450,
    description: "Great for regular monthly viewing.",
    channels: [...base200, ...load300Extra, ...load450Extra],
  },

  "500": {
    id: "500",
    name: "Load 500",
    amount: 500,
    description: "Extended access with premium channels.",
    channels: [...base200, ...load300Extra, ...load450Extra, ...load500Extra],
  },

  "600": {
    id: "600",
    name: "Load 600",
    amount: 600,
    description: "Extra-long viewing for the family.",
    channels: [
      ...base200,
      ...load300Extra,
      ...load450Extra,
      ...load500Extra,
      ...load600Extra,
    ],
  },

  "800": {
    id: "800",
    name: "Load 800",
    amount: 800,
    description: "Higher tier prepaid load.",
    channels: [
      ...base200,
      ...load300Extra,
      ...load450Extra,
      ...load500Extra,
      ...load600Extra,
      ...load800Extra,
    ],
  },

  "1000": {
    id: "1000",
    name: "Load 1000",
    amount: 1000,
    description: "Maximum validity and channel access.",
    channels: [
      ...base200,
      ...load300Extra,
      ...load450Extra,
      ...load500Extra,
      ...load600Extra,
      ...load800Extra,
      ...load1000Extra,
    ],
  },
};
