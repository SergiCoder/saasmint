import type { IReferenceGateway } from "@/application/ports/IReferenceGateway";
import type { PhonePrefix } from "@/domain/models/PhonePrefix";
import { publicApiFetch } from "./apiClient";

export class DjangoApiReferenceGateway implements IReferenceGateway {
  async getPhonePrefixes(): Promise<PhonePrefix[]> {
    return publicApiFetch<PhonePrefix[]>("/phone-prefixes/");
  }

  async getCurrencies(): Promise<string[]> {
    return publicApiFetch<string[]>("/currencies/");
  }

  async getLocales(): Promise<string[]> {
    return publicApiFetch<string[]>("/locales/");
  }

  async getTimezones(): Promise<string[]> {
    return publicApiFetch<string[]>("/timezones/");
  }
}
