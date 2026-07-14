"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { QrCode, Download, Copy, Check, Lock, Building2, FileImage } from "lucide-react";
import { Card, CardHeader, Button, Input, Field } from "@/components/ui";
import { changeClinicPassword, updateClinicSetting } from "@/lib/actions";

export default function SettingsClient({
  clinicName,
  doctorName,
  intakeUrl,
  qrDataUrl,
}: {
  clinicName: string;
  doctorName: string;
  intakeUrl: string;
  qrDataUrl: string;
}) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  function copyLink() {
    navigator.clipboard.writeText(intakeUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function downloadPng() {
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = "cardiointake-qr.png";
    a.click();
  }

  function downloadPoster() {
    const html = posterHtml(clinicName, intakeUrl, qrDataUrl);
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(html);
      w.document.close();
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500">QR code, clinic details & password</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* QR */}
        <Card>
          <CardHeader title="Patient intake QR code" icon={<QrCode className="h-4 w-4 text-accent" />} />
          <div className="flex flex-col items-center gap-4 p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrDataUrl}
              alt="Intake QR code"
              className="h-52 w-52 rounded-lg border border-slate-200"
            />
            <div className="w-full rounded-lg bg-slate-50 px-3 py-2 text-center text-sm text-slate-600 break-all">
              {intakeUrl}
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="outline" size="sm" onClick={downloadPng}>
                <Download className="h-4 w-4" /> PNG
              </Button>
              <Button variant="outline" size="sm" onClick={downloadPoster}>
                <FileImage className="h-4 w-4" /> A5 poster
              </Button>
              <Button variant="outline" size="sm" onClick={copyLink}>
                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy link"}
              </Button>
            </div>
            <p className="text-center text-xs text-slate-400">
              Display this QR at reception. Patients scan it to fill the form before the consult.
            </p>
          </div>
        </Card>

        <div className="space-y-4">
          {/* Clinic details */}
          <ClinicDetails
            clinicName={clinicName}
            doctorName={doctorName}
            onSaved={() => router.refresh()}
          />
          {/* Password */}
          <PasswordChange />
        </div>
      </div>
    </div>
  );
}

function ClinicDetails({
  clinicName,
  doctorName,
  onSaved,
}: {
  clinicName: string;
  doctorName: string;
  onSaved: () => void;
}) {
  const [name, setName] = useState(clinicName);
  const [doctor, setDoctor] = useState(doctorName);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function save() {
    setMsg(null);
    start(async () => {
      await updateClinicSetting("clinicName", name);
      await updateClinicSetting("doctorName", doctor);
      setMsg("Saved");
      onSaved();
      setTimeout(() => setMsg(null), 2000);
    });
  }

  return (
    <Card>
      <CardHeader title="Clinic details" icon={<Building2 className="h-4 w-4 text-accent" />} />
      <div className="space-y-3 p-4">
        <Field label="Clinic name">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Doctor name">
          <Input value={doctor} onChange={(e) => setDoctor(e.target.value)} />
        </Field>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={save} disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
          {msg && <span className="text-sm text-green-600">{msg}</span>}
        </div>
        <p className="text-xs text-slate-400">
          Note: the QR domain comes from the <code>NEXT_PUBLIC_APP_URL</code> env var.
        </p>
      </div>
    </Card>
  );
}

function PasswordChange() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    if (next !== confirm) {
      setErr("New passwords do not match.");
      return;
    }
    start(async () => {
      try {
        await changeClinicPassword(current, next);
        setMsg("Password changed.");
        setCurrent("");
        setNext("");
        setConfirm("");
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed to change password.");
      }
    });
  }

  return (
    <Card>
      <CardHeader title="Change password" icon={<Lock className="h-4 w-4 text-accent" />} />
      <form onSubmit={submit} className="space-y-3 p-4">
        <Field label="Current password">
          <Input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} />
        </Field>
        <Field label="New password" hint="At least 6 characters">
          <Input type="password" value={next} onChange={(e) => setNext(e.target.value)} />
        </Field>
        <Field label="Confirm new password">
          <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </Field>
        {err && <div className="text-sm text-red-600">{err}</div>}
        {msg && <div className="text-sm text-green-600">{msg}</div>}
        <Button size="sm" type="submit" disabled={pending}>
          {pending ? "Updating…" : "Update password"}
        </Button>
      </form>
    </Card>
  );
}

function posterHtml(clinicName: string, url: string, qr: string) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>Intake QR Poster</title>
  <style>
    @page { size: A5; margin: 0; }
    body { font-family: system-ui, sans-serif; margin: 0; }
    .poster { width: 148mm; height: 210mm; box-sizing: border-box; padding: 16mm 12mm;
      display: flex; flex-direction: column; align-items: center; text-align: center; color: #0f172a; }
    h1 { color: #0D9488; font-size: 26px; margin: 0 0 6px; }
    .sub { font-size: 15px; color: #475569; margin-bottom: 18px; }
    img { width: 88mm; height: 88mm; border: 2px solid #e2e8f0; border-radius: 12px; }
    .cta { font-size: 20px; font-weight: 700; margin: 20px 0 4px; }
    .cta-hi { font-size: 17px; color: #334155; }
    .url { margin-top: auto; font-size: 12px; color: #64748b; word-break: break-all; }
    .print-btn { margin: 20px; }
    @media print { .print-btn { display:none; } }
  </style></head>
  <body>
    <div class="poster">
      <h1>${escapeHtml(clinicName)}</h1>
      <div class="sub">Before you meet the doctor</div>
      <img src="${qr}" alt="QR" />
      <div class="cta">Scan to fill your details</div>
      <div class="cta-hi">कृपया डॉक्टर से मिलने से पहले अपनी जानकारी भरें</div>
      <div class="cta-hi">कृपया डॉक्टरांना भेटण्यापूर्वी तुमची माहिती भरा</div>
      <div class="url">${escapeHtml(url)}</div>
    </div>
    <div class="print-btn"><button onclick="window.print()">Print poster</button></div>
  </body></html>`;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
}
