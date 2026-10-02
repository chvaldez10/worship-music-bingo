// Shared song bank — Bingo cards/caller, Worship Singing Bee, and song charades.
// Replace or extend this list to customize the game.
export type Song = {
  id: string;
  title: string;
  artist?: string;
};

/** IDs define identity; matching titles with different IDs are allowed. */
export function validateSongs(songs: readonly Song[]): void {
  const ids = new Set<string>();
  for (const song of songs) {
    if (!song.id.trim() || !song.title.trim()) {
      throw new Error("Every song needs a non-empty ID and title. Update the master song list.");
    }
    if (ids.has(song.id)) {
      throw new Error(
        `Duplicate song ID "${song.id}". Give each song a unique ID in the master song list.`,
      );
    }
    ids.add(song.id);
  }
}

// Familiar hymns, worship classics, and widely sung contemporary songs.
// Keep IDs stable when editing or reordering. Retire IDs when replacing songs.
const raw: [id: string, title: string, artist?: string][] = [
  ["song-01", "Goodness of God", "Bethel Music / Jenn Johnson"],
  ["song-02", "Holy Forever", "Chris Tomlin"],
  ["song-50", "Revelation Song", "Kari Jobe"],
  ["song-04", "Great Are You Lord", "All Sons & Daughters"],
  ["song-05", "Build My Life", "Pat Barrett"],
  ["song-51", "The Heart of Worship", "Matt Redman"],
  ["song-07", "Firm Foundation (He Won't)", "Cody Carnes"],
  ["song-08", "Living Hope", "Phil Wickham"],
  ["song-09", "King of Kings", "Hillsong Worship"],
  ["song-52", "Lord I Lift Your Name on High", "Rick Founds"],
  ["song-11", "What a Beautiful Name", "Hillsong Worship"],
  ["song-12", "Way Maker", "Sinach"],
  ["song-13", "How Great Is Our God", "Chris Tomlin"],
  ["song-14", "10,000 Reasons (Bless the Lord)", "Matt Redman"],
  ["song-15", "Oceans (Where Feet May Fail)", "Hillsong UNITED"],
  ["song-16", "This Is Amazing Grace", "Phil Wickham"],
  ["song-17", "Cornerstone", "Hillsong Worship"],
  ["song-18", "Lord I Need You", "Matt Maher"],
  ["song-19", "Reckless Love", "Cory Asbury"],
  ["song-20", "Battle Belongs", "Phil Wickham"],
  ["song-21", "Raise a Hallelujah", "Bethel Music"],
  ["song-53", "Trading My Sorrows", "Darrell Evans"],
  ["song-54", "In Christ Alone", "Keith Getty / Stuart Townend"],
  ["song-55", "You Are My All in All", "Dennis Jernigan"],
  ["song-56", "As the Deer", "Martin Nystrom"],
  ["song-26", "Praise", "Elevation Worship"],
  ["song-27", "The Blessing", "Kari Jobe / Elevation Worship"],
  ["song-28", "Here I Am to Worship", "Tim Hughes"],
  ["song-29", "How He Loves", "David Crowder Band"],
  ["song-30", "Mighty to Save", "Hillsong Worship"],
  ["song-31", "Forever", "Chris Tomlin"],
  ["song-32", "Blessed Be Your Name", "Matt Redman"],
  ["song-33", "Our God", "Chris Tomlin"],
  ["song-34", "God of Wonders", "Third Day"],
  ["song-35", "Open the Eyes of My Heart", "Paul Baloche"],
  ["song-36", "Shout to the Lord", "Darlene Zschech"],
  ["song-37", "Above All", "Michael W. Smith"],
  ["song-38", "Indescribable", "Chris Tomlin"],
  ["song-39", "Hosanna", "Hillsong UNITED"],
  ["song-40", "Amazing Grace (My Chains Are Gone)", "Chris Tomlin"],
  ["song-41", "Glorious Day", "Passion / Kristian Stanfill"],
  ["song-42", "Good Good Father", "Chris Tomlin"],
  ["song-43", "Christ Is Enough", "Hillsong Worship"],
  ["song-44", "The Stand", "Hillsong UNITED"],
  ["song-45", "Every Praise", "Hezekiah Walker"],
  ["song-57", "Days of Elijah", "Robin Mark"],
  ["song-47", "Promises", "Maverick City Music"],
  ["song-48", "See a Victory", "Elevation Worship"],
  ["song-49", "I Speak Jesus", "Charity Gayle"],
  ["song-58", "How Great Thou Art"],
  ["song-59", "Great Is Thy Faithfulness"],
  ["song-60", "Blessed Assurance"],
  ["song-61", "It Is Well with My Soul"],
  ["song-62", "Holy, Holy, Holy"],
  ["song-63", "To God Be the Glory"],
  ["song-64", "What a Friend We Have in Jesus"],
  ["song-65", "The Old Rugged Cross"],
  ["song-66", "Because He Lives"],
  ["song-67", "I Surrender All"],
];

export const SONGS: Song[] = raw.map(([id, title, artist]) => ({
  id,
  title,
  ...(artist ? { artist } : {}),
}));
