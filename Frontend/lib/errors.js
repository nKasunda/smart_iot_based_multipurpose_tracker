export function friendlyError(error, fallback = "Something went wrong. Please try again.") {
  const status = error?.response?.status;
  const raw = error?.response?.data?.error || error?.response?.data?.message || error?.message || "";
  const text = String(raw).trim();
  const lower = text.toLowerCase();

  if (error?.code === "ECONNABORTED" || lower.includes("timeout")) {
    return "The request took too long. Check your connection and try again. If this happened while creating an account, the email service may need attention.";
  }

  if (!status && lower.includes("network")) {
    return "Could not reach the server. Check your connection and try again.";
  }

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return "You appear to be offline. Check your internet connection and try again.";
  }

  if (status === 400) {
    if (lower.includes("email") && lower.includes("password")) {
      return "Enter both your email address and password to continue.";
    }
    return text || "Some information is missing or invalid. Check the form and try again.";
  }

  if (status === 401) {
    if (lower.includes("credential")) {
      return "The email or password is incorrect. Check your details and try again.";
    }
    if (lower.includes("token")) {
      return "Your session has expired. Sign in again to continue.";
    }
    return "You are not signed in. Sign in and try again.";
  }

  if (status === 403) {
    if (lower.includes("verify")) return text;
    return "You do not have permission to do that. Contact an administrator if this seems wrong.";
  }

  if (status === 404) {
    if (lower.includes("device")) return "That tracker was not found. Check the IMEI or device ID and try again.";
    return "We could not find what you requested.";
  }

  if (status === 409) {
    if (lower.includes("pending verification")) {
      return "This email is waiting for verification. Enter the code already sent, or request a new code.";
    }
    if (lower.includes("email")) return "That email is already registered. Try signing in instead.";
    if (lower.includes("device")) return text || "That tracker is already claimed or already exists.";
    return text || "This conflicts with an existing record.";
  }

  if (status === 503) {
    if (lower.includes("verification code") || lower.includes("email")) {
      return "We could not send the verification code right now. Please try again shortly or ask the administrator to check the email settings.";
    }
    return "The service is temporarily unavailable. Please try again shortly.";
  }

  if (status === 429) {
    return "Too many attempts. Wait a moment, then try again.";
  }

  if (status >= 500) {
    return "The server could not complete the request right now. Please try again shortly.";
  }

  return text || fallback;
}
