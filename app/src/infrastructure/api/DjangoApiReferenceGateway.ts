import { z } from "zod";
import type { IReferenceGateway } from "@/application/ports/IReferenceGateway";
import type { PhonePrefix } from "@/domain/models/PhonePrefix";
import { publicApiFetch } from "./apiClient";
import { PhonePrefixSchema } from "./schemas";

const stringArraySchema = z.array(z.string());

export class DjangoApiReferenceGateway implements IReferenceGateway {
  async getPhonePrefixes(): Promise<PhonePrefix[]> {
    const raw = await publicApiFetch<unknown>("/phone-prefixes/");
    return z.array(PhonePrefixSchema).parse(raw);
  }

  async getCurrencies(): Promise<string[]> {
    const raw = await publicApiFetch<unknown>("/currencies/");
    return stringArraySchema.parse(raw);
  }

  async getLocales(): Promise<string[]> {
    const raw = await publicApiFetch<unknown>("/locales/");
    return stringArraySchema.parse(raw);
  }

  async getTimezones(): Promise<string[]> {
    const raw = await publicApiFetch<unknown>("/timezones/");
    return stringArraySchema.parse(raw);
  }
}
