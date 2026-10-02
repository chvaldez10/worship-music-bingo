import { SONGS } from "./songs";

export type Prompt = { id: string; title: string; detail?: string };
export type CharadesCategory = "bible" | "songs" | "church";
export const CHARADES_CATEGORIES: { id: CharadesCategory; label: string }[] = [
  { id: "bible", label: "Bible events" },
  { id: "songs", label: "Worship songs" },
  { id: "church", label: "Church activities" },
];

const bibleEvents = [
  "Noah building the ark",
  "David facing Goliath",
  "Moses parting the Red Sea",
  "Daniel in the lions' den",
  "Jonah and the great fish",
  "Jesus feeding the five thousand",
  "Jesus walking on water",
  "The birth of Jesus",
  "The good Samaritan helping a traveler",
  "The prodigal son returning home",
  "Zacchaeus climbing a tree",
  "Joshua and the walls of Jericho",
  "Jesus calming the storm",
  "The disciples casting their nets",
  "Jesus washing the disciples' feet",
  "The wise men following the star",
  "Moses and the burning bush",
  "Adam and Eve in the garden",
  "Joseph interpreting dreams",
  "Jesus turning water into wine",
  "The lost sheep being found",
  "Peter being freed from prison",
  "The resurrection of Jesus",
  "Ruth gathering grain",
];
const churchActivities = [
  "Leading worship",
  "Playing the drums",
  "Singing in the choir",
  "Reading the Bible",
  "Teaching Sunday school",
  "Welcoming visitors",
  "Setting up chairs",
  "Passing the offering basket",
  "Praying together",
  "Going to church camp",
  "Serving at a food pantry",
  "Preparing a church potluck",
  "Being baptized",
  "Decorating for Christmas",
  "Running the sound board",
  "Leading a small group",
  "Cleaning the church",
  "Handing out bulletins",
  "Practicing a worship song",
  "Playing a camp game",
];

export function charadesPrompts(category: CharadesCategory): Prompt[] {
  if (category === "songs") return SONGS.map((song) => ({ id: song.id, title: song.title }));
  return (category === "bible" ? bibleEvents : churchActivities).map((title, i) => ({
    id: `${category}-${i + 1}`,
    title,
  }));
}

export function singingBeePrompts(): Prompt[] {
  return SONGS.map((song) => ({
    id: song.id,
    title: song.title,
    ...(song.artist ? { detail: song.artist } : {}),
  }));
}
