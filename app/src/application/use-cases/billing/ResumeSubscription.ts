import type { ISubscriptionGateway } from "@/application/ports/ISubscriptionGateway";

export class ResumeSubscription {
  constructor(private readonly subscriptions: ISubscriptionGateway) {}

  async execute(): Promise<void> {
    await this.subscriptions.resumeSubscription();
  }
}
