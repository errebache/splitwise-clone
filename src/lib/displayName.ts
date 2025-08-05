/**
 * Utility helpers for deriving user-friendly names from user data. These
 * functions are shared across components that need to display a person's
 * name when the `full_name` field might be missing or set to a placeholder.
 */

export interface DisplayableUser {
  full_name?: string | null;
  email?: string | null;
  id?: string;
}

/**
 * Returns a human‑friendly display name for a user. If `full_name` is not
 * provided, empty, or matches common anonymous placeholders (e.g. "anonymous user"),
 * fall back to the part of the email before the "@". If no email is
 * available, returns a generic label.
 *
 * @param user - The user object containing name and email information.
 * @returns A string suitable for display in the UI.
 */
export function getDisplayName(user: DisplayableUser | undefined): string {
  if (!user) return '';
  const fullName = user.full_name?.trim();
  if (fullName && !/anonymous/i.test(fullName) && !/anonyme/i.test(fullName)) {
    return fullName;
  }
  const email = user.email?.trim();
  if (email) {
    const [localPart] = email.split('@');
    return localPart || email;
  }
  return 'Utilisateur';
}

/**
 * Derive initials from a display name. Used for avatar placeholders when
 * no profile picture is available.
 *
 * @param name - The display name returned from `getDisplayName`.
 * @returns The first two uppercase letters from the name.
 */
export function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase())
    .join('')
    .slice(0, 2);
}