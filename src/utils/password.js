// Client-side mirror of the backend password policy: at least 8 characters,
// one upper-case letter, one lower-case letter, one digit and one special character.
export const PASSWORD_POLICY_DESCRIPTION =
  'Heslo musí mít alespoň 8 znaků a obsahovat velké i malé písmeno, číslici a speciální znak.';

export function isPasswordValid(password) {
  if (!password || password.length < 8) return false;
  return (
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}
