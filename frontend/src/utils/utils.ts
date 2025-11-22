export const countChars = (text: string): number => {
  return text.length;
};

export const sanitizeSlug = (value: string, length: number): string => {
  const cleaned = value
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned.slice(0, length);
};


const generateRandomString = (length: number): string => {
  if (length <= 0) return "";
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, (value) => (value % 36).toString(36)).join("");
  }
  let result = "";
  while (result.length < length) {
    result += Math.random().toString(36).slice(2);
  }
  return result.slice(0, length);
};


export const generateSlugValue = (length: number): string => {
  const base = sanitizeSlug(generateRandomString(Math.max(length, 12)), length);
  if (base.length >= length) {
	return base;
  }
  return (base + "000000000000000000000000000000000000000000000000000000")
	.slice(0, length);
};

export const validateSlug = (value: string, minLength: number, maxLength: number): string | null => {
  if (!value) {
	return `Link must be between ${minLength} and ${maxLength} characters.`;
  }
  if (value.length < minLength) {
	return `Link must be at least ${minLength} characters.`;
  }
  return null;
};

