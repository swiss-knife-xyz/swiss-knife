function requestHandler(request: Request) {
  const response = new Response(
    JSON.stringify({
      error: "Rate limited",
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
  return response;
}

export { requestHandler as GET, requestHandler as POST };
