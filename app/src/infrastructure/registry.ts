import { DjangoApiOrgGateway } from "./api/DjangoApiOrgGateway";
import { DjangoApiOrgMemberGateway } from "./api/DjangoApiOrgMemberGateway";
import { DjangoApiPlanGateway } from "./api/DjangoApiPlanGateway";
import { DjangoApiProductGateway } from "./api/DjangoApiProductGateway";
import { DjangoApiSubscriptionGateway } from "./api/DjangoApiSubscriptionGateway";
import { DjangoApiReferenceGateway } from "./api/DjangoApiReferenceGateway";
import { DjangoApiUserGateway } from "./api/DjangoApiUserGateway";
import { SupabaseAuthGateway } from "./supabase/SupabaseAuthGateway";

export const authGateway = new SupabaseAuthGateway();
export const userGateway = new DjangoApiUserGateway();
export const planGateway = new DjangoApiPlanGateway();
export const productGateway = new DjangoApiProductGateway();
export const subscriptionGateway = new DjangoApiSubscriptionGateway();
export const orgGateway = new DjangoApiOrgGateway();
export const orgMemberGateway = new DjangoApiOrgMemberGateway();
export const referenceGateway = new DjangoApiReferenceGateway();
