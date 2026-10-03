import { z } from "zod";

export const LEADER_STORAGE_KEY = "camp-whos-the-leader-v1";
export const leaderNameSchema = z
  .string()
  .trim()
  .min(1, "Enter a name.")
  .max(120, "Use a name up to 120 characters.");
export const savedLeaderSchema = z.object({ version: z.literal(1), name: leaderNameSchema });
