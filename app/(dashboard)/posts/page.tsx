import { db } from "@/lib/db";
import { posts, postVersions } from "@/drizzle/schema";
import { desc, count, and, eq, ilike, inArray } from "drizzle-orm";
import Link from "next/link";
import SearchFilterBar from "@/components/ui/SearchFilterBar";
import Pagination from "@/components/ui/Pagination";
import PostStatusSelect from "@/components/posts/PostStatusSelect";
import DeletePostButton from "@/components/posts/DeletePostButton";
import PostCard from "@/components/posts/PostCard";
import PostMediaThumbnail from "@/components/posts/PostMediaThumbnail";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Social Publisher",
};

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  { value: "draft", label: "Concept" },
  { value: "scheduled", label: "Ingepland" },
  { value: "approved", label: "Goedgekeurd" },
  { value: "published", label: "Gepubliceerd" },
  { value: "failed", label: "Mislukt" },
];

export default async function PostsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || "1", 10) || 1);
  const status = params.status;
  const q = params.q?.trim();

  const conditions = [];
  if (status) conditions.push(eq(posts.status, status));
  if (q) {
    const matchingPostIds = db
      .select({ postId: postVersions.postId })
      .from(postVersions)
      .where(ilike(postVersions.caption, `%${q}%`));
    conditions.push(inArray(posts.id, matchingPostIds));
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const postsList = await db
    .select({
      id: posts.id,
      platforms: posts.platforms,
      contentType: posts.contentType,
      status: posts.status,
      createdAt: posts.createdAt,
      mediaUrls: postVersions.mediaUrls,
    })
    .from(posts)
    .leftJoin(postVersions, and(eq(postVersions.postId, posts.id), eq(postVersions.version, 1)))
    .where(where)
    .orderBy(desc(posts.createdAt))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);

  const [{ count: totalCount }] = await db.select({ count: count() }).from(posts).where(where);
  const [{ count: scheduledCount }] = await db
    .select({ count: count() })
    .from(posts)
    .where(eq(posts.status, "scheduled"));
  const [{ count: publishedCount }] = await db
    .select({ count: count() })
    .from(posts)
    .where(eq(posts.status, "published"));

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-brand-black">Social Publisher</h1>
          <p className="text-gray-600">Calendar, content, metrics</p>
        </div>
        <div className="flex items-center gap-3">
          <a href="/api/posts/export" className="btn-secondary text-sm py-2 px-4">
            Exporteren (CSV)
          </a>
          <Link href="/posts/new" className="btn-primary">
            + New Post
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard label="Total Posts" value={totalCount} />
        <StatCard label="Scheduled" value={scheduledCount} />
        <StatCard label="Published" value={publishedCount} />
      </div>

      <SearchFilterBar placeholder="Zoek in captions..." statusOptions={STATUS_OPTIONS} />

      {postsList.length > 0 ? (
        <>
          {/* Mobile: cards */}
          <div className="md:hidden space-y-3">
            {postsList.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>

          {/* Tablet/desktop: table */}
          <div className="hidden md:block bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold">Media</th>
                  <th className="px-6 py-3 text-left font-semibold">Platforms</th>
                  <th className="px-6 py-3 text-left font-semibold">Type</th>
                  <th className="px-6 py-3 text-left font-semibold">Status</th>
                  <th className="px-6 py-3 text-left font-semibold">Date</th>
                  <th className="px-6 py-3 text-left font-semibold">Actie</th>
                </tr>
              </thead>
              <tbody>
                {postsList.map((post) => (
                  <tr key={post.id} className="border-b border-gray-200">
                    <td className="px-6 py-3">
                      <PostMediaThumbnail mediaUrls={post.mediaUrls} />
                    </td>
                    <td className="px-6 py-3">{post.platforms?.join(", ") || "—"}</td>
                    <td className="px-6 py-3">{post.contentType}</td>
                    <td className="px-6 py-3">
                      <PostStatusSelect id={post.id} status={post.status} />
                    </td>
                    <td className="px-6 py-3 text-xs text-gray-500">
                      {post.createdAt ? new Date(post.createdAt).toLocaleDateString("nl-NL") : "—"}
                    </td>
                    <td className="px-6 py-3">
                      <DeletePostButton id={post.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </div>
        </>
      ) : (
        <div className="p-8 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-center">
          <p className="text-gray-600 mb-4">Geen posts nog.</p>
          <Link href="/posts/new" className="btn-primary">
            Create First Post
          </Link>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="p-4 bg-white border border-gray-200 rounded-lg">
      <p className="text-gray-600 text-sm mb-1">{label}</p>
      <p className="text-2xl font-bold text-brand-black">{value}</p>
    </div>
  );
}
