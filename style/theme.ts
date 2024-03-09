import { extendTheme, ThemeConfig } from "@chakra-ui/react";

const colors = {
  custom: {
    base: "#e84142",
    greenLight: "#19cb01",
    greenDark: "#16b201",
    greenDarker: "#129801",
    yellow: "#EDF676",
    pale: "#f0f0f0",
    black: "#121212",
  },
  bg: {
    900: "#101010",
    100: "white",
  },
};

const fonts = {
  brand: "Poppins",
};

const config: ThemeConfig = {
  initialColorMode: "dark",
  useSystemColorMode: false,
};

const theme = extendTheme({
  styles: {
    global: {
      html: {
        scrollBehavior: "smooth",
      },
      body: {
        bg: "bg.900",
        color: "white",
        fontFamily: "Poppins",
      },
    },
  },
  config,
  colors,
  fonts,
});

export default theme;
