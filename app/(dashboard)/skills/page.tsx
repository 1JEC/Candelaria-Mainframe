import type { Metadata } from "next";
import SkillsTabs from "@/components/dashboard/SkillsTabs";

export const metadata: Metadata = {
  title: "Skills",
};

export default function SkillsPage() {
  return <SkillsTabs />;
}
