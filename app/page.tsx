import { redirect } from "next/navigation";

export default async function Home() {
  // Demo: always redirect to login (in production, check session)
  redirect("/login");
}
