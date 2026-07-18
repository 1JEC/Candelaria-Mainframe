import Link from "next/link";
import type { Metadata } from "next";
import NewPostForm from "@/components/posts/NewPostForm";

export const metadata: Metadata = {
  title: "Nieuwe post",
};

export default function NewPostPage() {
  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link href="/posts" className="text-sm text-brand-green hover:underline">
          ← Terug naar Social Publisher
        </Link>
      </div>
      <h1 className="text-3xl font-bold text-brand-black mb-6">Nieuwe post</h1>

      <NewPostForm />
    </div>
  );
}
