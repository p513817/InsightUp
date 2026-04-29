import { z } from "zod";

export const addFriendSchema = z.object({
  friendCode: z.string().trim().min(1, "請輸入好友 ID。").max(32, "好友 ID 格式不正確。"),
});