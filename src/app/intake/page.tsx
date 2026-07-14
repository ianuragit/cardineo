import IntakeWizard from "./IntakeWizard";

export const metadata = {
  title: "Patient Intake — CardioIntake",
};

export default function IntakePage() {
  const clinicName = process.env.CLINIC_NAME || "Cardineo Heart Clinic";
  return (
    <main className="intake-root min-h-screen bg-background">
      <IntakeWizard clinicName={clinicName} />
    </main>
  );
}
