import type { PhonePrefix } from "@/domain/models/PhonePrefix";

export interface IReferenceGateway {
  getPhonePrefixes(): Promise<PhonePrefix[]>;
  getCurrencies(): Promise<string[]>;
  getLocales(): Promise<string[]>;
  getTimezones(): Promise<string[]>;
}
