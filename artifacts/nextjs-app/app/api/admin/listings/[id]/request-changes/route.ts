import { NextRequest } from "next/server";
import { moderate } from "../moderate";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  return moderate(req, ctx, "request-changes");
}
