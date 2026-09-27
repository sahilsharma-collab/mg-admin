import type { AddVideoInput } from "@/contracts/api-types";

// The General and Tutorial YouTube screens were two byte-for-byte-identical
// trees (893 lines across 8 files) whose only differences were the four values
// below. They are now one set of components parameterised by this variant.
export type YouTubeVariant = "general" | "tutorial";

interface VariantConfig {
  /** Path segment under /youtube, and the API's list route suffix. */
  slug: YouTubeVariant;
  /** Human label, e.g. "General" -> "Add General YouTube Video". */
  label: string;
  /** The API's discriminator on POST /api/video. */
  apiType: AddVideoInput["type"];
}

export const VARIANTS: Record<YouTubeVariant, VariantConfig> = {
  general: { slug: "general", label: "General", apiType: "GENERAL" },
  tutorial: { slug: "tutorial", label: "Tutorial", apiType: "TUTORIAL" },
};
