import { readSessions, writeSessions } from "../../../lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const sessions = await readSessions();
  return Response.json({ sessions });
}

export async function POST(req) {
  const body = await req.json();
  const sessions = await readSessions();
  const session = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    date: body.date,
    machine: body.machine || "",
    players: body.players,
  };
  const next = [...sessions, session];
  await writeSessions(next);
  return Response.json({ sessions: next });
}

export async function PUT(req) {
  const body = await req.json();
  const sessions = await readSessions();
  const next = sessions.map((s) =>
    s.id === body.id
      ? { ...s, date: body.date, machine: body.machine || "", players: body.players }
      : s
  );
  await writeSessions(next);
  return Response.json({ sessions: next });
}

export async function DELETE(req) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const sessions = await readSessions();
  const next = sessions.filter((s) => s.id !== id);
  await writeSessions(next);
  return Response.json({ sessions: next });
}
