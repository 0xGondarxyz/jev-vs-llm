// Sorts one message with every sorter at once, so the page can show them side by side.
import { sort } from "../../../lib/sorters";

const SORTERS = ["jev", "anthropic/claude-haiku-5.5", "anthropic/claude-fable-5.1"];

export async function POST(request: Request) {
  const { message } = await request.json();
  if (typeof message !== "string" || !message.trim() || message.length > 1000) {
    return Response.json({ error: "Send a message between 1 and 1000 characters." }, { status: 400 });
  }
  const results = await Promise.all(SORTERS.map((sorter) => sort(message, sorter)));
  return Response.json({ results });
}
