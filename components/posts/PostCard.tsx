import PostStatusSelect from "@/components/posts/PostStatusSelect";
import DeletePostButton from "@/components/posts/DeletePostButton";
import PostMediaThumbnail from "@/components/posts/PostMediaThumbnail";

export default function PostCard({
  post,
}: {
  post: {
    id: string;
    platforms: string[] | null;
    contentType: string | null;
    status: string | null;
    createdAt: Date | null;
    mediaUrls?: string[] | null;
  };
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <p className="font-medium text-brand-black">{post.platforms?.join(", ") || "—"}</p>
        <PostStatusSelect id={post.id} status={post.status} />
      </div>
      <PostMediaThumbnail mediaUrls={post.mediaUrls} size="md" />
      <div className="text-sm text-gray-600 space-y-1">
        <p>{post.contentType}</p>
        <p className="text-xs text-gray-500">
          {post.createdAt ? new Date(post.createdAt).toLocaleDateString("nl-NL") : "—"}
        </p>
      </div>
      <div className="flex items-center justify-end pt-1 border-t border-gray-100">
        <DeletePostButton id={post.id} />
      </div>
    </div>
  );
}
