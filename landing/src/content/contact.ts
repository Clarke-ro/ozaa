export type ContactDraft = {
  restaurant: string;
  name: string;
  phone: string;
  email: string;
  whatsapp: string;
  message: string;
};

export type ContactMessages = {
  missingRestaurant: string;
  missingName: string;
  missingReach: string;
};

export type ContactField = "restaurant" | "name" | "reach";

export type ContactCheck =
  | { ok: true }
  | { ok: false; field: ContactField; message: string };

export type PublicContact =
  | ({
      readonly status: "placeholder";
      readonly notice: string;
      readonly held: string;
    } & ContactMessages)
  | {
      readonly status: "ready";
      readonly whatsappHref: string;
      readonly phoneHref: string;
      readonly emailHref: string;
    };

export function contactMode(contact: PublicContact): "placeholder" | "ready" {
  if (contact.status === "placeholder") return "placeholder";
  if (
    contact.whatsappHref.trim() !== "" &&
    contact.phoneHref.trim() !== "" &&
    contact.emailHref.trim() !== ""
  ) {
    return "ready";
  }
  return "placeholder";
}

export function checkContactDraft(
  draft: ContactDraft,
  copy: ContactMessages,
): ContactCheck {
  if (draft.restaurant.trim() === "") {
    return { ok: false, field: "restaurant", message: copy.missingRestaurant };
  }
  if (draft.name.trim() === "") {
    return { ok: false, field: "name", message: copy.missingName };
  }
  const reach = [draft.phone, draft.email, draft.whatsapp].some(
    (value) => value.trim() !== "",
  );
  if (!reach) {
    return { ok: false, field: "reach", message: copy.missingReach };
  }
  return { ok: true };
}

export function draftFromForm(data: FormData): ContactDraft {
  const text = (key: string): string => {
    const value = data.get(key);
    return typeof value === "string" ? value : "";
  };
  return {
    restaurant: text("restaurant"),
    name: text("name"),
    phone: text("phone"),
    email: text("email"),
    whatsapp: text("whatsapp"),
    message: text("message"),
  };
}
