import type { ISubscriptionGateway } from "@/application/ports/ISubscriptionGateway";

export class UpdateSeats {
  constructor(private readonly subscriptions: ISubscriptionGateway) {}

  async execute(quantity: number): Promise<void> {
    await this.subscriptions.updateSeats(quantity);
  }
}
