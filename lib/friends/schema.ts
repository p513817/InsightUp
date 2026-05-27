import { z } from "zod";

export const addFriendSchema = z.object({
  friendCode: z.string().trim().min(1, "Please enter a friend ID.").max(32, "The friend ID format is invalid."),
});
