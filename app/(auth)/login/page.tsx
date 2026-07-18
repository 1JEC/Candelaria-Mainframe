import { Suspense } from "react";
import type { Metadata } from "next";
import LoginForm from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Inloggen",
  description:
    "Log in bij het Candelaria Agency operations-portal voor het beheren van leads, social media en klantcommunicatie.",
  alternates: { canonical: "/login" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Inloggen | Candelaria Agency",
    description: "Het interne operations-portal van Candelaria Agency.",
    url: "/login",
    siteName: "Candelaria Agency",
    locale: "nl_NL",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Inloggen | Candelaria Agency",
    description: "Het interne operations-portal van Candelaria Agency.",
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  name: "Candelaria Agency",
  image: "/logo.png",
  logo: "/logo.png",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Den Haag",
    addressCountry: "NL",
  },
  areaServed: "NL",
  description:
    "Candelaria Agency bouwt websites op maat en verzorgt onderhoud en social media management voor Nederlandse MKB-ondernemers.",
};

function LoginPageContent() {
  return <LoginForm />;
}

export default function LoginPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <Suspense fallback={<LoginPageSkeleton />}>
        <LoginPageContent />
      </Suspense>
    </>
  );
}

function LoginPageSkeleton() {
  return (
    <div className="min-h-screen bg-brand-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-brand-black mb-2">
            Mainframe HQ
          </h1>
          <p className="text-gray-600">Candelaria Agency Operations Portal</p>
        </div>
        <div className="space-y-4">
          <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </div>
    </div>
  );
}
