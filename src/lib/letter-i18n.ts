export type Lang = "en" | "hi" | "kn";

export const LANGS: { id: Lang; label: string; name: string; locale: string }[] = [
  { id: "en", label: "English", name: "English", locale: "en-IN" },
  { id: "hi", label: "हिन्दी", name: "Hindi", locale: "hi-IN" },
  { id: "kn", label: "ಕನ್ನಡ", name: "Kannada", locale: "kn-IN" },
];

export const isLang = (v: unknown): v is Lang => LANGS.some((l) => l.id === v);

/**
 * Fixed wording for the demo-mode (template) letter. The per-point details come from the
 * audit and stay in English there; the AI letter is written fully in the chosen language.
 */
export type Phrases = {
  addr: string;
  contact: string;
  to: string;
  toInsurer: string;
  toHospital: string;
  insurerPlaceholder: string;
  hospitalPlaceholder: string;
  addressPlaceholder: string;
  subjectInsurer: string;
  subjectHospital: string;
  refs: { policy: string; claim: string; bill: string };
  salutation: string;
  patient: string;
  hospital: string;
  stay: (from: string, to: string) => string;
  intro: (recipient: "insurer" | "hospital") => string;
  detailsNote: string;
  evidence: string;
  reference: string;
  amount: string;
  remedy: string;
  total: (amt: string) => string;
  closingInsurer: string;
  closingHospital: string;
  enclosures: string;
  encBill: string;
  encInsurer: string;
  encHospital: string;
  sign: string;
  placeholder: { name: string; patient: string; date: string; ref: string };
};

export const PHRASES: Record<Exclude<Lang, "en">, Phrases> = {
  hi: {
    addr: "[पता]",
    contact: "[फ़ोन] | [ईमेल]",
    to: "सेवा में,",
    toInsurer: "शिकायत निवारण अधिकारी",
    toHospital: "बिलिंग एवं रोगी संबंध विभाग",
    insurerPlaceholder: "[बीमा कंपनी का नाम]",
    hospitalPlaceholder: "[अस्पताल का नाम]",
    addressPlaceholder: "[पता]",
    subjectInsurer: "विषय: दावा निपटान पर आपत्ति",
    subjectHospital: "विषय: अस्पताल के बिल पर आपत्ति",
    refs: { policy: "पॉलिसी सं.", claim: "दावा सं.", bill: "बिल सं." },
    salutation: "महोदय/महोदया,",
    patient: "रोगी",
    hospital: "अस्पताल",
    stay: (a, b) => `भर्ती अवधि: ${a} से ${b}`,
    intro: (r) => `उपरोक्त उपचार के संबंध में ${r === "insurer" ? "दावा निपटान पत्र और पॉलिसी शब्दावली" : "विस्तृत बिल"} की समीक्षा के बाद निम्नलिखित बिंदुओं पर आपत्ति दर्ज की जाती है:`,
    detailsNote: "(प्रत्येक बिंदु का विवरण ऑडिट रिपोर्ट के अनुसार अंग्रेज़ी में दिया गया है।)",
    evidence: "प्रमाण",
    reference: "संदर्भ",
    amount: "विवादित राशि",
    remedy: "अपेक्षित समाधान",
    total: (amt) => `कुल माँगी गई राशि: ${amt}।`,
    closingInsurer: "यदि 15 दिनों के भीतर इस शिकायत का समाधान नहीं होता है, तो मामला बीमा लोकपाल (Insurance Ombudsman) के पास ले जाया जाएगा और IRDAI के बीमा भरोसा (Bima Bharosa) पोर्टल पर दर्ज किया जाएगा।",
    closingHospital: "कृपया संशोधित विस्तृत अंतिम बिल दें और 15 दिनों के भीतर राशि वापस करें। समाधान न होने पर मामला बीमाकर्ता और उपयुक्त उपभोक्ता मंच के समक्ष उठाया जाएगा।",
    enclosures: "संलग्नक:",
    encBill: "विस्तृत अस्पताल बिल",
    encInsurer: "दावा निपटान पत्र एवं पॉलिसी शब्दावली",
    encHospital: "डिस्चार्ज सारांश",
    sign: "भवदीय,",
    placeholder: { name: "[आपका नाम]", patient: "[रोगी का नाम]", date: "[तिथि]", ref: "[संदर्भ संख्या]" },
  },
  kn: {
    addr: "[ವಿಳಾಸ]",
    contact: "[ಫೋನ್] | [ಇಮೇಲ್]",
    to: "ಇವರಿಗೆ,",
    toInsurer: "ಕುಂದುಕೊರತೆ ನಿವಾರಣಾ ಅಧಿಕಾರಿ",
    toHospital: "ಬಿಲ್ಲಿಂಗ್ ಮತ್ತು ರೋಗಿ ಸಂಬಂಧ ವಿಭಾಗ",
    insurerPlaceholder: "[ವಿಮಾ ಕಂಪನಿಯ ಹೆಸರು]",
    hospitalPlaceholder: "[ಆಸ್ಪತ್ರೆಯ ಹೆಸರು]",
    addressPlaceholder: "[ವಿಳಾಸ]",
    subjectInsurer: "ವಿಷಯ: ಕ್ಲೈಮ್ ಇತ್ಯರ್ಥದ ಕುರಿತು ಆಕ್ಷೇಪಣೆ",
    subjectHospital: "ವಿಷಯ: ಆಸ್ಪತ್ರೆ ಬಿಲ್ ಕುರಿತು ಆಕ್ಷೇಪಣೆ",
    refs: { policy: "ಪಾಲಿಸಿ ಸಂ.", claim: "ಕ್ಲೈಮ್ ಸಂ.", bill: "ಬಿಲ್ ಸಂ." },
    salutation: "ಮಾನ್ಯರೇ,",
    patient: "ರೋಗಿ",
    hospital: "ಆಸ್ಪತ್ರೆ",
    stay: (a, b) => `ದಾಖಲಾತಿ ಅವಧಿ: ${a} ರಿಂದ ${b}`,
    intro: (r) => `ಮೇಲಿನ ಚಿಕಿತ್ಸೆಗೆ ಸಂಬಂಧಿಸಿದ ${r === "insurer" ? "ಕ್ಲೈಮ್ ಇತ್ಯರ್ಥ ಪತ್ರ ಮತ್ತು ಪಾಲಿಸಿ ವಿವರಗಳನ್ನು" : "ವಿವರವಾದ ಬಿಲ್ ಅನ್ನು"} ಪರಿಶೀಲಿಸಿದ ನಂತರ ಈ ಕೆಳಗಿನ ಅಂಶಗಳ ಬಗ್ಗೆ ಆಕ್ಷೇಪಣೆ ಸಲ್ಲಿಸಲಾಗಿದೆ:`,
    detailsNote: "(ಪ್ರತಿ ಅಂಶದ ವಿವರಗಳು ಆಡಿಟ್ ವರದಿಯಂತೆ ಇಂಗ್ಲಿಷ್‌ನಲ್ಲಿವೆ.)",
    evidence: "ಸಾಕ್ಷ್ಯ",
    reference: "ಉಲ್ಲೇಖ",
    amount: "ವಿವಾದಿತ ಮೊತ್ತ",
    remedy: "ಕೋರಿದ ಪರಿಹಾರ",
    total: (amt) => `ಒಟ್ಟು ಕೋರಿದ ಮೊತ್ತ: ${amt}.`,
    closingInsurer: "15 ದಿನಗಳೊಳಗೆ ಈ ದೂರಿಗೆ ಪರಿಹಾರ ಸಿಗದಿದ್ದರೆ, ವಿಷಯವನ್ನು ವಿಮಾ ಒಂಬುಡ್ಸ್‌ಮನ್‌ಗೆ ಸಲ್ಲಿಸಿ IRDAI ಬಿಮಾ ಭರೋಸಾ ಪೋರ್ಟಲ್‌ನಲ್ಲಿ ದಾಖಲಿಸಲಾಗುವುದು.",
    closingHospital: "ದಯವಿಟ್ಟು ತಿದ್ದುಪಡಿ ಮಾಡಿದ ವಿವರವಾದ ಅಂತಿಮ ಬಿಲ್ ನೀಡಿ ಮತ್ತು 15 ದಿನಗಳೊಳಗೆ ಮೊತ್ತವನ್ನು ಮರುಪಾವತಿಸಿ. ಪರಿಹಾರ ಸಿಗದಿದ್ದರೆ ವಿಷಯವನ್ನು ವಿಮಾದಾರರು ಮತ್ತು ಸೂಕ್ತ ಗ್ರಾಹಕ ವೇದಿಕೆಯ ಮುಂದೆ ಇಡಲಾಗುವುದು.",
    enclosures: "ಲಗತ್ತುಗಳು:",
    encBill: "ವಿವರವಾದ ಆಸ್ಪತ್ರೆ ಬಿಲ್",
    encInsurer: "ಕ್ಲೈಮ್ ಇತ್ಯರ್ಥ ಪತ್ರ ಮತ್ತು ಪಾಲಿಸಿ ವಿವರಗಳು",
    encHospital: "ಡಿಸ್ಚಾರ್ಜ್ ಸಾರಾಂಶ",
    sign: "ಇಂತಿ ನಿಮ್ಮ ವಿಶ್ವಾಸಿ,",
    placeholder: { name: "[ನಿಮ್ಮ ಹೆಸರು]", patient: "[ರೋಗಿಯ ಹೆಸರು]", date: "[ದಿನಾಂಕ]", ref: "[ಉಲ್ಲೇಖ ಸಂಖ್ಯೆಗಳು]" },
  },
};
