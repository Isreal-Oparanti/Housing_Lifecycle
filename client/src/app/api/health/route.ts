export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({
    status: "ok",
    service: "truecost",
    timestamp: new Date().toISOString(),
  });
}
