import type { PhonePrefix } from "@/domain/models/PhonePrefix";

export interface IReferenceGateway {
  getPhonePrefixes(): Promise<PhonePrefix[]>;
  getPronouns(): Promise<string[]>;
}
