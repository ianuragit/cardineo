import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import PortalShell from "@/components/PortalShell";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const clinicName = process.env.CLINIC_NAME || "Cardineo Heart Clinic";

  return (
    <PortalShell role={session.role} clinicName={clinicName}>
      {children}
    </PortalShell>
  );
}
