import { db } from "@/lib/db";
import { intakeSubmissions } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import SubmissionActions from "@/components/offertes/SubmissionActions";
import { formTypeLabel } from "@/lib/formTypes";

export const metadata: Metadata = {
  title: "Offerte-aanvraag",
};

export default async function OfferteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const submission = await db.query.intakeSubmissions.findFirst({
    where: eq(intakeSubmissions.id, id),
  });
  if (!submission) notFound();

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <Link href="/offertes" className="text-sm text-brand-green hover:underline">
          ← Terug naar Offertes
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
        <div>
          <span className="px-2 py-1 bg-brand-green/10 text-brand-green rounded text-xs font-medium mb-2 inline-block">
            {formTypeLabel(submission.formType)}
          </span>
          <h1 className="text-3xl font-bold text-brand-black">{submission.name || submission.email}</h1>
          <p className="text-gray-600">
            {submission.createdAt ? new Date(submission.createdAt).toLocaleString("nl-NL") : "—"}
          </p>
        </div>
        <SubmissionActions
          id={submission.id}
          isSpam={Boolean(submission.isSpam)}
          reviewed={Boolean(submission.reviewedAt)}
        />
      </div>

      <div className="bg-white p-6 rounded-lg border border-gray-200 space-y-4 mb-6">
        <h2 className="text-lg font-semibold text-brand-black">Contactgegevens</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">E-mail</p>
            <p className="font-medium">{submission.email}</p>
          </div>
          <div>
            <p className="text-gray-500">Telefoon</p>
            <p className="font-medium">{submission.phone || "—"}</p>
          </div>
          <div>
            <p className="text-gray-500">Bedrijf</p>
            <p className="font-medium">{submission.company || "—"}</p>
          </div>
          <div>
            <p className="text-gray-500">Website</p>
            <p className="font-medium">{submission.website || "—"}</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg border border-gray-200 mb-6">
        <h2 className="text-lg font-semibold text-brand-black mb-3">Aanvraag</h2>
        <p className="text-sm text-gray-700 whitespace-pre-line">{submission.message || "—"}</p>
      </div>

      {submission.convertedToLeadId && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h2 className="text-lg font-semibold text-brand-black mb-3">Gekoppelde lead</h2>
          <Link href={`/leads/${submission.convertedToLeadId}`} className="text-brand-green hover:underline text-sm">
            Bekijk lead →
          </Link>
        </div>
      )}
    </div>
  );
}
