function isVideoUrl(url: string) {
  return /\.(mp4|mov|webm)$/i.test(url);
}

export default function PostMediaThumbnail({
  mediaUrls,
  size = "sm",
}: {
  mediaUrls: string[] | null | undefined;
  size?: "sm" | "md";
}) {
  if (!mediaUrls || mediaUrls.length === 0) {
    return <div className="text-xs text-gray-400">—</div>;
  }

  const dimension = size === "sm" ? "h-12 w-12" : "h-20 w-20";

  return (
    <div className="flex items-center gap-1">
      {mediaUrls.slice(0, 3).map((url, idx) => (
        <div key={idx} className={`relative ${dimension} rounded-md overflow-hidden bg-gray-100 border border-gray-200 flex-shrink-0`}>
          {isVideoUrl(url) ? (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video src={url} muted className="w-full h-full object-cover" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="" className="w-full h-full object-cover" />
          )}
        </div>
      ))}
      {mediaUrls.length > 3 && (
        <span className="text-xs text-gray-500">+{mediaUrls.length - 3}</span>
      )}
    </div>
  );
}
