import type { IReferenceGateway } from "@/application/ports/IReferenceGateway";
import type { PhonePrefix } from "@/domain/models/PhonePrefix";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";

export class DjangoApiReferenceGateway implements IReferenceGateway {
  async getPhonePrefixes(): Promise<PhonePrefix[]> {
    const res = await fetch(`${API_URL}/api/v1/phone-prefixes/`);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`API ${res.status}: ${text}`);
    }
    return res.json() as Promise<PhonePrefix[]>;
  }

  async getPronouns(): Promise<string[]> {
    const res = await fetch(`${API_URL}/api/v1/pronouns/`);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`API ${res.status}: ${text}`);
    }
    return res.json() as Promise<string[]>;
  }
}
