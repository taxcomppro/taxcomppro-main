import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { hasPhoneNumber, phoneReturnPath } from "@/lib/phone-number";
import PhoneCapture from "@/components/auth/PhoneCapture";

export default async function CompleteProfilePage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const destination = phoneReturnPath(next);
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect(`/login?next=${encodeURIComponent(destination)}`);
  if (hasPhoneNumber((session.user as { phone?: string | null }).phone)) redirect(destination);
  return <PhoneCapture returnTo={destination} />;
}
