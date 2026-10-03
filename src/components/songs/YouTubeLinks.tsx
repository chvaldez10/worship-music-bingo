export function YouTubeLinks({ urls, title }: { urls: string[]; title: string }) {
  if (!urls.length) return null;
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1">
      {urls.map((url, index) => (
        <a
          key={url}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open ${title} on YouTube${urls.length > 1 ? `, version ${index + 1}` : ""} (opens in a new tab)`}
          className="inline-flex min-h-11 items-center text-sm font-semibold text-primary underline underline-offset-4"
        >
          YouTube{urls.length > 1 ? ` ${index + 1}` : ""} ↗
        </a>
      ))}
    </div>
  );
}
