export class SecretRedactor {
  private static readonly SECRET_PATTERNS: RegExp[] = [
    // AWS API keys
    /AKIA[0-9A-Z]{16}/g,
    // GitHub personal tokens
    /gh[pousr]_[A-Za-z0-9_]{36,255}/g,
    // Generic API keys or tokens with common prefixes
    /(api[_-]?key|bearer|token|secret|password)["'\s:=]+([A-Za-z0-9\-_.]{8,})/gi,
    // Private keys
    /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g,
  ];

  public static redact(text: string): string {
    if (!text) return text;
    let redacted = text;
    for (const pattern of this.SECRET_PATTERNS) {
      redacted = redacted.replace(pattern, (_match, prefix, secret) => {
        if (prefix && secret) {
          return `${prefix}: [REDACTED_SECRET]`;
        }
        return '[REDACTED_SECRET]';
      });
    }
    return redacted;
  }
}
