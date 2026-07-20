declare module "solc" {
  type ImportResult = { contents: string } | { error: string };

  const solc: {
    compile(
      input: string,
      callbacks?: { import(path: string): ImportResult }
    ): string;
    version(): string;
  };

  export default solc;
}
