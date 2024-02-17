"use client";

import React, { useState } from "react";
import {
	Heading,
	Textarea,
	FormControl,
	FormLabel,
	HStack,
	Spacer,
	Text,
	Container,
	VStack,
} from "@chakra-ui/react";
const CharacterCounter = () => {
	const [input, setInput] = useState<string>();
	const [count, setCount] = useState<number>();

	return (
		<>
			<Heading color={"custom.pale"}>Character Counter</Heading>
			<Container pb='3rem' maxWidth='inherit'>
				<VStack spacing={5}>
					<FormControl mt='1rem'>
						<FormLabel>
							<HStack>
								<Text>Text</Text>
								<Spacer />
							</HStack>
						</FormLabel>
						<Textarea
							placeholder=''
							value={input}
							onChange={(e) => {
								setInput(e.target.value);
								setCount(e.target.value.length);
							}}
							rows={6}
							onMouseUpCapture={(e) =>
								setCount(
									window.getSelection()?.toString().length !==
										0
										? window.getSelection()?.toString()
												.length
										: input?.length
								)
							}
						></Textarea>
						<FormLabel mt='1rem'>
							<HStack>
								<Text fontWeight='bold'>
									Characters : {count}
								</Text>
							</HStack>
						</FormLabel>
					</FormControl>
				</VStack>
			</Container>
		</>
	);
};

export default CharacterCounter;
