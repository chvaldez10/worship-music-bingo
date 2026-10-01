// Master song list — used by BOTH card generation and the caller page.
// Replace or extend this list to customize the game.
export type Song = {
  id: string;
  title: string;
  artist?: string;
};

const raw: [string, string][] = [
  ["Goodness of God", "Bethel Music / Jenn Johnson"],
  ["Holy Forever", "Chris Tomlin"],
  ["Gratitude", "Brandon Lake"],
  ["Great Are You Lord", "All Sons & Daughters"],
  ["Build My Life", "Pat Barrett"],
  ["Trust in God", "Elevation Worship"],
  ["Firm Foundation (He Won't)", "Cody Carnes"],
  ["Living Hope", "Phil Wickham"],
  ["King of Kings", "Hillsong Worship"],
  ["Who Else", "Gateway Worship"],
  ["What a Beautiful Name", "Hillsong Worship"],
  ["Way Maker", "Sinach"],
  ["How Great Is Our God", "Chris Tomlin"],
  ["10,000 Reasons (Bless the Lord)", "Matt Redman"],
  ["Oceans (Where Feet May Fail)", "Hillsong UNITED"],
  ["This Is Amazing Grace", "Phil Wickham"],
  ["Cornerstone", "Hillsong Worship"],
  ["Lord I Need You", "Matt Maher"],
  ["Reckless Love", "Cory Asbury"],
  ["Battle Belongs", "Phil Wickham"],
  ["Raise a Hallelujah", "Bethel Music"],
  ["House of the Lord", "Phil Wickham"],
  ["Same God", "Elevation Worship"],
  ["Graves Into Gardens", "Elevation Worship"],
  ["Egypt", "Bethel Music / Cory Asbury"],
  ["Praise", "Elevation Worship"],
  ["The Blessing", "Kari Jobe / Elevation Worship"],
  ["Here I Am to Worship", "Tim Hughes"],
  ["How He Loves", "David Crowder Band"],
  ["Mighty to Save", "Hillsong Worship"],
  ["Forever", "Chris Tomlin"],
  ["Blessed Be Your Name", "Matt Redman"],
  ["Our God", "Chris Tomlin"],
  ["God of Wonders", "Third Day"],
  ["Open the Eyes of My Heart", "Paul Baloche"],
  ["Shout to the Lord", "Darlene Zschech"],
  ["Above All", "Michael W. Smith"],
  ["Indescribable", "Chris Tomlin"],
  ["Hosanna", "Hillsong UNITED"],
  ["Amazing Grace (My Chains Are Gone)", "Chris Tomlin"],
];

export const SONGS: Song[] = raw.map(([title, artist], i) => ({
  id: `song-${String(i + 1).padStart(2, "0")}`,
  title,
  artist,
}));
