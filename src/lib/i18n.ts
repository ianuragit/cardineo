// Lightweight i18n scaffolding for the public intake (PRD §5, §16 Q4).
// English is complete & mandatory; Hindi/Marathi cover the patient-facing chrome
// and fall back to English for anything not translated.

export type Locale = "en" | "hi" | "mr";

export const LOCALES: { value: Locale; label: string }[] = [
  { value: "en", label: "English" },
  { value: "hi", label: "हिंदी" },
  { value: "mr", label: "मराठी" },
];

type Dict = Record<string, string>;

const en: Dict = {
  "landing.title": "Before you meet the doctor",
  "landing.subtitle":
    "Please fill in a few details. It takes about 3 minutes and helps the doctor understand your case faster.",
  "landing.start": "Start",
  "landing.time": "For patients: this takes about 3 minutes",
  "step.next": "Next",
  "step.back": "Back",
  "step.skip": "Skip this step",
  "step.submit": "Submit",
  "step.of": "of",
  "step.1": "Your details",
  "step.2": "Visit",
  "step.3": "Complaint & symptoms",
  "step.4": "History & risk",
  "step.5": "Medicines",
  "step.6": "Reports",
  "consent.label":
    "I consent to this clinic storing this information for my medical care.",
  "redflag.title": "Please inform the reception desk right away.",
  "redflag.body":
    "Your answers suggest you may need urgent attention. Please show this screen to the reception staff immediately.",
  "redflag.ack": "I understand — I will inform reception",
  "success.title": "Thank you — you're all set",
  "success.instruction": "Please show this number at reception.",
  "success.token": "Your queue number",
  "privacy":
    "Your information is stored securely and used only for your medical care at this clinic.",
};

const hi: Dict = {
  "landing.title": "डॉक्टर से मिलने से पहले",
  "landing.subtitle":
    "कृपया कुछ जानकारी भरें। इसमें लगभग 3 मिनट लगते हैं और इससे डॉक्टर को आपकी स्थिति समझने में मदद मिलती है।",
  "landing.start": "शुरू करें",
  "landing.time": "मरीज़ों के लिए: इसमें लगभग 3 मिनट लगते हैं",
  "step.next": "आगे",
  "step.back": "पीछे",
  "step.skip": "इस चरण को छोड़ें",
  "step.submit": "जमा करें",
  "step.of": "में से",
  "consent.label":
    "मैं इस क्लिनिक को मेरी चिकित्सा देखभाल के लिए यह जानकारी संग्रहीत करने की सहमति देता/देती हूँ।",
  "redflag.title": "कृपया तुरंत रिसेप्शन डेस्क को सूचित करें।",
  "redflag.ack": "मैं समझ गया/गई — मैं रिसेप्शन को बताऊंगा/बताऊंगी",
  "success.title": "धन्यवाद — आपका पंजीकरण हो गया",
  "success.instruction": "कृपया यह नंबर रिसेप्शन पर दिखाएँ।",
  "success.token": "आपका क्यू नंबर",
};

const mr: Dict = {
  "landing.title": "डॉक्टरांना भेटण्यापूर्वी",
  "landing.subtitle":
    "कृपया काही माहिती भरा. यास सुमारे 3 मिनिटे लागतात आणि यामुळे डॉक्टरांना तुमची स्थिती लवकर समजते.",
  "landing.start": "सुरू करा",
  "landing.time": "रुग्णांसाठी: यास सुमारे 3 मिनिटे लागतात",
  "step.next": "पुढे",
  "step.back": "मागे",
  "step.skip": "हा टप्पा वगळा",
  "step.submit": "सबमिट करा",
  "step.of": "पैकी",
  "consent.label":
    "मी या क्लिनिकला माझ्या वैद्यकीय काळजीसाठी ही माहिती साठवण्यास संमती देतो/देते.",
  "redflag.title": "कृपया लगेच रिसेप्शन डेस्कला कळवा.",
  "redflag.ack": "मला समजले — मी रिसेप्शनला सांगेन",
  "success.title": "धन्यवाद — तुमची नोंदणी झाली",
  "success.instruction": "कृपया हा क्रमांक रिसेप्शनला दाखवा.",
  "success.token": "तुमचा रांग क्रमांक",
};

const dicts: Record<Locale, Dict> = { en, hi, mr };

export function t(locale: Locale, key: string): string {
  return dicts[locale]?.[key] ?? en[key] ?? key;
}
