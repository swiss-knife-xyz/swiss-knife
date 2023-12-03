"use client";

import React, { useState } from "react";
import { Heading, Table, Tbody, Tr, Td } from "@chakra-ui/react";
import { parseEther, parseGwei, formatEther, formatGwei } from "viem";
import { InputField } from "@/components/InputField";
import { Label } from "@/components/Label";

const CalldataEncoder = () => {
  return (
    <>
      <Heading color={"custom.pale"}>Calldata Encoder</Heading>
    </>
  );
};

export default CalldataEncoder;
