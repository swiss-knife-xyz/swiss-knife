export const getDisplayFunctionName = (
  functionName?: string,
  guessedFunctionName?: string
): { name?: string; isGuessed: boolean } => {
  if (functionName && functionName !== "__abi_decoded__") {
    return { name: functionName, isGuessed: false };
  }

  if (guessedFunctionName) {
    return { name: guessedFunctionName, isGuessed: true };
  }

  return { name: undefined, isGuessed: false };
};
