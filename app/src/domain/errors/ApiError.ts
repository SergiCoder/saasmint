import { isRecord } from "@/lib/typeGuards";
import { DomainError } from "./DomainError";

function extractBodyCode(body: unknown): string | null {
  if (isRecord(body) && typeof body.code === "string" && body.code.length > 0) {
    return body.code;
  }
  return null;
}

export class ApiError extends DomainError {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
    code?: string,
  ) {
    super(`API ${status}`, code ?? extractBodyCode(body) ?? `HTTP_${status}`);
  }

  /**
   * Extract a Django-style `{ detail: string }` or `string[]` message from the
   * parsed body, when available. Returns null for unrecognized shapes.
   */
  get detail(): string | null {
    const body = this.body;
    if (Array.isArray(body)) {
      const parts = body.filter((v): v is string => typeof v === "string");
      return parts.length > 0 ? parts.join(" ") : null;
    }
    if (isRecord(body) && typeof body.detail === "string") {
      return body.detail;
    }
    return null;
  }
}
