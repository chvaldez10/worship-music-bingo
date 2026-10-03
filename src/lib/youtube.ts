/** Accept HTTPS links to individual YouTube videos, including mobile and short links. */
export function isYouTubeVideoUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return false;
    const videoId = /^[A-Za-z0-9_-]{11}$/;
    if (url.hostname === "youtu.be") return videoId.test(url.pathname.slice(1));
    if (
      !["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com"].includes(
        url.hostname,
      )
    )
      return false;
    if (url.pathname === "/watch") return videoId.test(url.searchParams.get("v") ?? "");
    return /^\/(shorts|live|embed)\/[A-Za-z0-9_-]{11}\/?$/.test(url.pathname);
  } catch {
    return false;
  }
}
