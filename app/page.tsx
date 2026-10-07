import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import LandingPage from "@/components/landing/LandingPage";

export default async function HomePage() {
  // Request headers keep the home decision specific to this visitor's session.
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders }).catch(() => null);
  if (session?.user) redirect("/feed");
  return <LandingPage />;
}
