export class NetworkModuleError extends Error {
  readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = "NetworkModuleError";
    this.code = code;
  }
}

export class OtpExpiredError extends NetworkModuleError {
  constructor(message = "Verification code has expired.") {
    super(message, "otp_expired");
    this.name = "OtpExpiredError";
  }
}

export class OtpInvalidCodeError extends NetworkModuleError {
  constructor(message = "Invalid verification code.") {
    super(message, "otp_invalid");
    this.name = "OtpInvalidCodeError";
  }
}

export class OtpTooManyAttemptsError extends NetworkModuleError {
  constructor(message = "Too many verification attempts.") {
    super(message, "otp_too_many_attempts");
    this.name = "OtpTooManyAttemptsError";
  }
}

export class OtpResendCooldownError extends NetworkModuleError {
  readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super(
      `Wait ${retryAfterSeconds}s before requesting another code.`,
      "otp_resend_cooldown",
    );
    this.name = "OtpResendCooldownError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export class OtpChallengeNotFoundError extends NetworkModuleError {
  constructor(message = "No outstanding verification challenge.") {
    super(message, "otp_not_found");
    this.name = "OtpChallengeNotFoundError";
  }
}

export class SessionNotFoundError extends NetworkModuleError {
  constructor(message = "Network session not found.") {
    super(message, "session_not_found");
    this.name = "SessionNotFoundError";
  }
}

export class DeviceNotFoundError extends NetworkModuleError {
  constructor(message = "Device not found.") {
    super(message, "device_not_found");
    this.name = "DeviceNotFoundError";
  }
}

export class DuplicateConnectionError extends NetworkModuleError {
  constructor(message = "Device already has an active in-quota session.") {
    super(message, "duplicate_connection");
    this.name = "DuplicateConnectionError";
  }
}

export class AdapterFailureError extends NetworkModuleError {
  constructor(message = "Network adapter operation failed.") {
    super(message, "adapter_failure");
    this.name = "AdapterFailureError";
  }
}

export class IdentityRequiredError extends NetworkModuleError {
  constructor(message = "Provide an email or phone number.") {
    super(message, "identity_required");
    this.name = "IdentityRequiredError";
  }
}
