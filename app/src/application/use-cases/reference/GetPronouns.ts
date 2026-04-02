import type { IReferenceGateway } from "@/application/ports/IReferenceGateway";

export class GetPronouns {
  constructor(private readonly references: IReferenceGateway) {}

  async execute(): Promise<string[]> {
    return this.references.getPronouns();
  }
}
