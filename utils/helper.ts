export const Helper = {
  toJid: (phone: string) => {
    return `${phone.replace(/\D/g, "")}@s.whatsapp.net`;
  },
};
