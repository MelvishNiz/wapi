import { AsYouType } from "libphonenumber-js/max";

export const Helper = {
  toJid: (phone: string) => {
    return `${phone.replace(/\D/g, "")}@s.whatsapp.net`;
  },
  getAuthCode(url: string): string | null {
    if (!url) return null;
    const match = url.match(/[?&]code=([^&]+)/);
    return match?.[1] ? decodeURIComponent(match[1]) : null;
  },

  validatePhoneNumber: (phoneNumber: string) => {
    const asYouType = new AsYouType();
    asYouType.input(`+${phoneNumber}`);
    const number = asYouType.getNumber();
    const isValid = number?.isValid();
    const type = number?.getType();

    return {
      isValid: isValid && (type === "MOBILE" || type === "FIXED_LINE_OR_MOBILE"),
      national: number?.formatNational(),
      international: number?.formatInternational(),
    };
  },
};
