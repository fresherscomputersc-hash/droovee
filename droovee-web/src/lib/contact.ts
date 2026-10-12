// Business contact numbers. Set via env, else the official number below.
export const CONTACT_PHONE_DISPLAY = process.env.NEXT_PUBLIC_CONTACT_PHONE ?? "+91 81149 94367";
const digits = CONTACT_PHONE_DISPLAY.replace(/\D/g, "");
export const CONTACT_TEL = `tel:+${digits}`;
export const CONTACT_WHATSAPP = `https://wa.me/${digits}?text=${encodeURIComponent("Hi Droovee, I need a driver.")}`;
export const waWithText = (text: string) => `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
export const CONTACT_ADDRESS = "Bhubaneswar, Odisha · Open 24×7";
