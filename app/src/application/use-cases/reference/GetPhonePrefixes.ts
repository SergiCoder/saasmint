import type { PhonePrefix } from "@/domain/models/PhonePrefix";
import type { IReferenceGateway } from "@/application/ports/IReferenceGateway";

export class GetPhonePrefixes {
  constructor(private readonly references: IReferenceGateway) {}

  async execute(): Promise<PhonePrefix[]> {
    return this.references.getPhonePrefixes();
  }
}
