import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import LoginForm from "./LoginForm";

export const metadata = { title: "Login — CardioIntake" };

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/");
  const clinicName = process.env.CLINIC_NAME || "Cardineo Heart Clinic";
  return <LoginForm clinicName={clinicName} />;
}
