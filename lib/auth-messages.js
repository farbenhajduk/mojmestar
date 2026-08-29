export function authErrorMessage(error, fallback = "Došlo je do pogreške. Pokušajte ponovno.") {
  const code = error?.code || "";
  const message = (error?.message || "").toLowerCase();

  if (code === "invalid_credentials" || message.includes("invalid login credentials")) {
    return "E-mail adresa ili lozinka nisu ispravni.";
  }

  if (code === "email_not_confirmed" || message.includes("email not confirmed")) {
    return "Prvo potvrdite svoju e-mail adresu.";
  }

  if (code === "user_already_exists" || message.includes("already registered")) {
    return "Račun s ovom e-mail adresom već postoji.";
  }

  if (code === "weak_password" || message.includes("password should be")) {
    return "Lozinka je preslaba. Upotrijebite najmanje 6 znakova.";
  }

  if (code === "over_email_send_rate_limit" || message.includes("rate limit")) {
    return "Poslano je previše zahtjeva. Pričekajte nekoliko minuta pa pokušajte ponovno.";
  }

  if (code === "same_password" || message.includes("same password")) {
    return "Nova lozinka mora se razlikovati od prethodne.";
  }

  return fallback;
}
