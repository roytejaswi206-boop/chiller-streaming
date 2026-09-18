export interface AdItem {
  id: string;
  type: "PRE_ROLL" | "MID_ROLL" | "BANNER";
  title: string;
  mediaUrl: string;
  clickThroughUrl: string;
  durationSeconds: number;
  skipOffsetSeconds?: number;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  interval: "month" | "year";
  currency: string;
  features: string[];
}

/**
 * Platform Subscription Plans (Config / DB driven)
 */
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "FREE",
    name: "Free Access",
    price: 0,
    interval: "month",
    currency: "USD",
    features: [
      "Standard Definition (up to 720p)",
      "Standard Streaming Speed",
      "Community Access",
      "Watch History & Basic Watchlist",
    ],
  },
  {
    id: "PREMIUM_MONTHLY",
    name: "Premium Monthly",
    price: 14.99,
    interval: "month",
    currency: "USD",
    features: [
      "100% Ad-Free Experience",
      "Full HD & 4K Ultra Streaming",
      "Unlimited Access to All Categories",
      "Early Access to New Releases",
      "Priority High-Speed CDN Origins",
      "VIP Profile Badge",
    ],
  },
  {
    id: "PREMIUM_YEARLY",
    name: "Premium Annual (Save 30%)",
    price: 119.99,
    interval: "year",
    currency: "USD",
    features: [
      "All Premium Monthly Perks",
      "Best Value - Save Over 30%",
      "VIP Dedicated Support",
      "Exclusive Behind-The-Scenes Content",
    ],
  },
];

/**
 * Advertising Provider Abstraction
 */
export class AdsProvider {
  static isEnabled(): boolean {
    return process.env.AD_ENABLED === "true";
  }

  static async getPreRoll(videoId: string, isUserPremium = false): Promise<AdItem | null> {
    if (!this.isEnabled() || isUserPremium) return null;

    // If VAST or ad provider configured, return compliant VAST ad
    if (process.env.AD_PROVIDER_VAST_URL) {
      return {
        id: `ad-preroll-${videoId}`,
        type: "PRE_ROLL",
        title: "Sponsored Partner",
        mediaUrl: process.env.AD_PROVIDER_VAST_URL,
        clickThroughUrl: "https://velora.com/premium",
        durationSeconds: 15,
        skipOffsetSeconds: 5,
      };
    }

    return null;
  }

  static async getBanner(_isUserPremium = false): Promise<string | null> {
    if (!this.isEnabled() || _isUserPremium) return null;
    return null;
  }
}
