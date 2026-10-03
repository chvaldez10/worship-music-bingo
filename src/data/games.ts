/** Add future games here to include them in the hub. */
export const GAMES = [
  {
    id: "bingo",
    path: "/bingo",
    title: "Worship Bingo",
    shortTitle: "Bingo",
    subtitle: "Listen & mark",
    description:
      "Randomized song cards, a host caller, and printable cards with 1, 2, or 4 per page.",
    details: "Individual cards · Great for the whole camp",
  },
  {
    id: "charades",
    path: "/charades",
    title: "Charades",
    shortTitle: "Charades",
    subtitle: "Act & guess",
    description:
      "Act out Bible events, worship songs, and church activities with a timer and team scores.",
    details: "2–6 teams · Timed team turns",
  },
  {
    id: "singing-bee",
    path: "/singing-bee",
    title: "Worship Singing Bee",
    shortTitle: "Singing Bee",
    subtitle: "Sing & continue",
    description:
      "The host starts a worship song. Your team carries it on before the timer runs out.",
    details: "2–6 teams · Shared worship song bank",
  },
  {
    id: "whos-the-leader",
    path: "/whos-the-leader",
    title: "Who’s the Leader?",
    shortTitle: "Who’s the Leader?",
    subtitle: "Copy & discover",
    description:
      "Copy a secret leader’s changing actions while the guesser tries to spot who is in charge.",
    details: "Whole-group circle · No equipment",
  },
] as const;
