/** Checks the contact form before it is sent. Plain TypeScript, so the tests run it in Node. */

export type ContactDraft = { name: string; email: string; message: string; company: string };
export type ContactMessages = { name: string; email: string; message: string };
export type ContactCheck =
  | { ok: true; spam: boolean }
  | { ok: false; errors: Partial<Record<keyof ContactMessages, string>> };

// Something@something.something: enough to catch typos, without rejecting real addresses.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function checkContact(draft: ContactDraft, messages: ContactMessages): ContactCheck {
  const errors: Partial<Record<keyof ContactMessages, string>> = {};
  if (!draft.name.trim()) errors.name = messages.name;
  if (!EMAIL.test(draft.email.trim())) errors.email = messages.email;
  if (!draft.message.trim()) errors.message = messages.message;
  if (Object.keys(errors).length) return { ok: false, errors };
  // The hidden "company" field is the anti-spam trap: people leave it empty.
  return { ok: true, spam: draft.company.trim() !== "" };
}
