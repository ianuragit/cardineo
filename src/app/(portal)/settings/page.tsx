import QRCode from "qrcode";
import { prisma } from "@/lib/db";
import SettingsClient from "./SettingsClient";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await prisma.setting.findMany({
    where: { key: { in: ["clinicName", "doctorName"] } },
  });
  const settingMap = Object.fromEntries(settings.map((s) => [s.key, s.value]));

  const clinicName = settingMap.clinicName || process.env.CLINIC_NAME || "Cardineo Heart Clinic";
  const doctorName = settingMap.doctorName || process.env.DOCTOR_NAME || "Dr. A. Sharma";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const intakeUrl = `${appUrl.replace(/\/$/, "")}/intake`;

  // Generate QR as a PNG data URL on the server.
  const qrDataUrl = await QRCode.toDataURL(intakeUrl, {
    width: 480,
    margin: 2,
    color: { dark: "#0F172A", light: "#FFFFFF" },
  });

  return (
    <SettingsClient
      clinicName={clinicName}
      doctorName={doctorName}
      intakeUrl={intakeUrl}
      qrDataUrl={qrDataUrl}
    />
  );
}
