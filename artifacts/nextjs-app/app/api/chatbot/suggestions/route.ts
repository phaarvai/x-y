import { NextRequest, NextResponse } from "next/server";
import { ChatbotService } from "@/lib/chatbot-service";

export async function GET(req: NextRequest) {
  const role = new URL(req.url).searchParams.get("role");
  return NextResponse.json({ suggestions: ChatbotService.getSuggestions(role) });
}
