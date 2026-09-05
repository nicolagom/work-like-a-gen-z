export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      const result = await env.DB
        .prepare("SELECT 1 AS ok")
        .first();

      return Response.json({
        worker: "working",
        database: result?.ok === 1 ? "connected" : "not connected"
      });
    }

    if (url.pathname === "/api/streak") {
      const result = await env.DB
        .prepare(`
          SELECT COUNT(*) AS wins
          FROM boundary_wins
          WHERE user_id = ?
        `)
        .bind("demo-user")
        .first();

      return Response.json({
        user: "demo-user",
        wins: result?.wins ?? 0
      });
    }

    return env.ASSETS.fetch(request);
  }
};
