"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import {
  Box,
  chakra,
  HStack,
  Input,
  InputGroup,
  InputRightElement,
  Text,
} from "@chakra-ui/react";
import { DayPicker, type ChevronProps } from "@daypicker/react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
} from "lucide-react";
import "@daypicker/react/style.css";
import styles from "./HistoricalDateTimePicker.module.css";

const dayLabel = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const utcDay = (date: Date) => date.toISOString().slice(0, 10);
function CalendarChevron({ orientation, className, style }: ChevronProps) {
  const Icon =
    orientation === "left"
      ? ChevronLeft
      : orientation === "right"
        ? ChevronRight
        : orientation === "up"
          ? ChevronUp
          : ChevronDown;
  return (
    <Icon className={className} style={style} size={16} aria-hidden="true" />
  );
}

export function HistoricalDateTimePicker({
  value,
  onChange,
  isDisabled,
}: {
  value: string;
  onChange(value: string): void;
  isDisabled: boolean;
}) {
  const dateText = value.split("T")[0];
  const parts = (value.split("T")[1] ?? "00:00:00").split(":");
  const hour24 = Number(parts[0] || "0");
  const period = hour24 >= 12 ? "PM" : "AM";
  const displayHour = String(hour24 % 12 || 12).padStart(2, "0");
  const [hourDraft, setHourDraft] = useState(displayHour);
  const hourFocused = useRef(false);
  useEffect(() => {
    if (!hourFocused.current) setHourDraft(displayHour);
  }, [displayHour, value === ""]);
  const candidate = /^\d{4}-\d{2}-\d{2}$/.test(dateText)
    ? new Date(`${dateText}T12:00:00Z`)
    : undefined;
  const selected =
    candidate &&
    Number.isFinite(candidate.getTime()) &&
    utcDay(candidate) === dateText
      ? candidate
      : undefined;
  const date = selected ? dateText : "";
  const today = new Date();
  const [month, setMonth] = useState(() => selected ?? today);
  useEffect(() => {
    if (date) setMonth(new Date(`${date}T12:00:00Z`));
  }, [date]);
  const setTime = (index: number, next: string) => {
    if (!/^\d{0,2}$/.test(next)) return;
    const updated = [parts[0] ?? "00", parts[1] ?? "00", parts[2] ?? "00"];
    updated[index] = next;
    onChange(`${date || utcDay(today)}T${updated.join(":")}`);
  };
  const changeHour = (next: string) => {
    if (!/^\d{0,2}$/.test(next)) return;
    setHourDraft(next);
    const hour = Number(next);
    if (next && hour >= 1 && hour <= 12)
      setTime(
        0,
        String((hour % 12) + (period === "PM" ? 12 : 0)).padStart(2, "0")
      );
  };
  const hourInput = (
    <InputGroup size="sm">
      <Input
        aria-label="Hours (UTC)"
        placeholder="HH"
        value={hourDraft}
        onChange={(event) => changeHour(event.target.value)}
        onFocus={(event) => {
          hourFocused.current = true;
          event.target.select();
        }}
        onBlur={() => {
          hourFocused.current = false;
          if (hourDraft && Number(hourDraft) >= 1 && Number(hourDraft) <= 12)
            setHourDraft(hourDraft.padStart(2, "0"));
        }}
        isInvalid={
          !hourDraft || Number(hourDraft) < 1 || Number(hourDraft) > 12
        }
        pattern="(?:0?[1-9]|1[0-2])"
        required
        inputMode="numeric"
        maxLength={2}
        fontFamily="mono"
        pl={2}
        pr="3.5rem"
        bg="bg.muted"
        rounded="md"
        isDisabled={isDisabled}
      />
      <InputRightElement
        width="3.5rem"
        h="full"
        px={1}
        borderLeft="1px solid"
        borderColor="border.default"
      >
        <chakra.select
          aria-label="AM/PM"
          value={period}
          onChange={(event: ChangeEvent<HTMLSelectElement>) => {
            const hour =
              Number(hourDraft) >= 1 && Number(hourDraft) <= 12
                ? Number(hourDraft)
                : hour24 % 12 || 12;
            setTime(
              0,
              String(
                (hour % 12) + (event.target.value === "PM" ? 12 : 0)
              ).padStart(2, "0")
            );
          }}
          w="full"
          h="full"
          appearance="none"
          bg="transparent"
          border={0}
          pl={1}
          pr={5}
          cursor="pointer"
          fontSize="xs"
          color="text.secondary"
          disabled={isDisabled}
          sx={{ colorScheme: "dark" }}
          _focusVisible={{
            outline: "2px solid",
            outlineColor: "primary.400",
            borderRadius: "sm",
          }}
        >
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </chakra.select>
        <Box
          as={ChevronDown}
          boxSize={3}
          position="absolute"
          right={2}
          top="50%"
          transform="translateY(-50%)"
          pointerEvents="none"
          color="text.secondary"
          aria-hidden="true"
        />
      </InputRightElement>
    </InputGroup>
  );
  return (
    <Box className={styles.picker}>
      <DayPicker
        mode="single"
        required
        timeZone="UTC"
        weekStartsOn={1}
        selected={selected}
        month={month}
        onMonthChange={setMonth}
        onSelect={(day) =>
          onChange(
            `${utcDay(day)}T${parts.map((part) => part.padStart(2, "0")).join(":")}`
          )
        }
        startMonth={new Date("1970-01-01T12:00:00Z")}
        endMonth={today}
        disabled={
          isDisabled ? true : { after: new Date(`${utcDay(today)}T23:59:59Z`) }
        }
        disableNavigation={isDisabled}
        captionLayout="dropdown"
        navLayout="after"
        reverseYears
        showOutsideDays
        fixedWeeks
        components={{ Chevron: CalendarChevron }}
        labels={{
          labelDayButton: (day) => dayLabel.format(day),
          labelMonthDropdown: () => "Month",
          labelYearDropdown: () => "Year",
        }}
      />
      <HStack
        spacing={1.5}
        mt={3}
        pt={3}
        borderTop="1px solid"
        borderColor="border.default"
      >
        {(["Hours (UTC)", "Minutes", "Seconds"] as const).map(
          (label, index) => (
            <HStack
              key={label}
              spacing={1.5}
              flex={index === 0 ? 1.8 : 1}
              minW={index === 0 ? "6rem" : 0}
            >
              {index > 0 && (
                <Text color="text.tertiary" aria-hidden="true">
                  :
                </Text>
              )}
              {index === 0 ? (
                hourInput
              ) : (
                <Input
                  aria-label={label}
                  placeholder={["HH", "MM", "SS"][index]}
                  value={parts[index] ?? "00"}
                  onChange={(event) => setTime(index, event.target.value)}
                  onBlur={(event) => {
                    if (event.target.value)
                      setTime(index, event.target.value.padStart(2, "0"));
                  }}
                  onFocus={(event) => event.target.select()}
                  isInvalid={
                    !!parts[index] &&
                    Number(parts[index]) > (index === 0 ? 23 : 59)
                  }
                  inputMode="numeric"
                  pattern={index === 0 ? "(?:[01][0-9]|2[0-3])" : "[0-5][0-9]"}
                  maxLength={2}
                  size="sm"
                  fontFamily="mono"
                  textAlign="center"
                  minW={0}
                  bg="bg.muted"
                  rounded="md"
                  isDisabled={isDisabled}
                />
              )}
            </HStack>
          )
        )}
        <Text fontSize="xs" color="text.tertiary" ml={1}>
          UTC
        </Text>
      </HStack>
    </Box>
  );
}
