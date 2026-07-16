import { db } from "@/lib/db";
import { posts } from "@/drizzle/schema";
import { desc, count } from "drizzle-orm";
import Link from "next/link";

export default async function PostsPage() {
  const postsList = await db
    .select()
    .from(posts)
    .orderBy(desc(posts.createdAt))
    .limit(20);

  const postCount = await db.select({ count: count() }).from(posts);

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-brand-black">
            Social Publisher
          </h1>
          <p className="text-gray-600">Calendar, content, metrics</p>
        </div>
        <Link href="/dashboard/posts/new" className="btn-primary">
          + New Post
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard label="Total Posts" value={postCount[0]?.count || 0} />
        <StatCard label="Scheduled" value={0} />
        <StatCard label="Published" value={0} />
      </div>

      {postsList.length > 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold">
                    Platforms
                  </th>
                  <th className="px-6 py-3 text-left font-semibold">Type</th>
                  <th className="px-6 py-3 text-left font-semibold">Status</th>
                  <th className="px-6 py-3 text-left font-semibold">Date</th>
                </tr>
              </thead>
              <tbody>
                {postsList.map((post) => (
                  <tr key={post.id} className="border-b border-gray-200">
                    <td className="px-6 py-3">
                      {post.platforms?.join(", ") || "—"}
                    </td>
                    <td className="px-6 py-3">{post.contentType}</td>
                    <td className="px-6 py-3">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          post.status === "published"
                            ? "bg-green-100 text-green-800"
                            : post.status === "scheduled"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {post.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-xs text-gray-500">
                      {post.createdAt ? new Date(post.createdAt).toLocaleDateString("nl-NL") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="p-8 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-center">
          <p className="text-gray-600 mb-4">Geen posts nog.</p>
          <Link href="/dashboard/posts/new" className="btn-primary">
            Create First Post
          </Link>
        </div>
      )}
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
