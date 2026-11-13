export type Tier = "new" | "rising" | "trusted" | "top";
export type Author = { id: number; name: string; handle: string; initials: string; city: string | null; tier: Tier; score: number | null };
export type Card = {
  id: number; slug: string; title: string; quote: string; rating: number; level: number; proofType: string; visitedOn: string; publishedAt: string | null; helpful: number;
  business: { id: number; slug: string; name: string; category: string; city: string; area: string | null; isSample: boolean };
  author: Author;
};
export type Trust = { score: number | null; tier: Tier; accuracyCount: number; accuracyMatched: number; helpfulVotes: number; published: number; confirmedShare: number; questions: number; answered: number; upheld: number };
