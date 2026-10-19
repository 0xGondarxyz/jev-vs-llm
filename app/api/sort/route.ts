// Sorts one message with one sorter. The page calls this once per sorter, at the same time,
// so each answer shows up the moment it is ready.
import { sort } from "../../../lib/sorters";

const SORTERS = ["jev", "deepseek/deepseek-v4.1-flash", "anthropic/claude-haiku-5.5", "anthropic/claude-fable-5.1"];

export async function POST(request: Request) {
  const { message, sorter } = await request.json();
  if (typeof message !== "string" || !message.trim() || message.length > 1000) {
    return Response.json({ error: "Send a message between 1 and 1000 characters." }, { status: 400 });
  }
  if (!SORTERS.includes(sorter)) {
    return Response.json({ error: `Unknown sorter. Use one of: ${SORTERS.join(", ")}.` }, { status: 400 });
  }
  return Response.json(await sort(message, sorter));
}
