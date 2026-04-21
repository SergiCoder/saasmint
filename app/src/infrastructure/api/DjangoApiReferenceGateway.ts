import { z } from "zod";
import type { IReferenceGateway } from "@/application/ports/IReferenceGateway";
import type { PhonePrefix } from "@/domain/models/PhonePrefix";
import { publicApiFetch } from "./apiClient";
import { PhonePrefixSchema } from "./schemas";

export class DjangoApiReferenceGateway implements IReferenceGateway {
  async getPhonePrefixes(): Promise<PhonePrefix[]> {
    const raw = await publicApiFetch<unknown>("/phone-prefixes/");
    return z.array(PhonePrefixSchema).parse(raw);
  }
}
