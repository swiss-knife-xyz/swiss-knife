function requestHandler(request: Request) {
  const response = Response.json(
    {
      error: "Rate limited",
    },
    {
      status: 429,
    }
  );
  return response;
}

export { requestHandler as GET, requestHandler as POST };
