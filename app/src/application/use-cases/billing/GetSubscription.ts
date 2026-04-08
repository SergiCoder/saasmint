import type { Subscription } from "@/domain/models/Subscription";
import type { ISubscriptionGateway } from "@/application/ports/ISubscriptionGateway";

export class GetSubscription {
  constructor(private readonly subscriptions: ISubscriptionGateway) {}

  async execute(): Promise<Subscription | null> {
    return this.subscriptions.getSubscription();
  }
}
