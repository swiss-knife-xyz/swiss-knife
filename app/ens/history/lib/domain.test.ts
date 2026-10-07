import assert from "node:assert/strict";
import test from "node:test";
import {
  indexedDomainDetails,
  registrationDetails,
  withCurrentContenthash,
} from "./domain";

const indexed = {
  id: "node",
  createdAt: "1575442906",
  expiryDate: "1804075666",
  owner: { id: "manager" },
  registrant: { id: "registrant" },
};

test("missing resolver and current content retain ownership and registration", () => {
  for (const resolver of [null, undefined]) {
    const details = withCurrentContenthash(
      indexedDomainDetails({ ...indexed, resolver }, false),
      null
    );
    assert.equal(details.resolver, null);
    assert.equal(details.currentContenthash, null);
    assert.equal(details.owner, "manager");
    assert.equal(details.registrant, "registrant");
    assert.equal(details.createdAt, 1575442906);
    assert.equal(details.expiryDate, 1804075666);
  }
});

test("present resolver without content does not gate domain details", () => {
  const details = indexedDomainDetails(
    { ...indexed, resolver: { id: "resolver" } },
    false
  );
  for (const hash of [null, undefined, "0x"]) {
    assert.deepEqual(withCurrentContenthash(details, hash), details);
  }
});

test("missing registration dates and wrapper sentinel expiries become unavailable", () => {
  const details = indexedDomainDetails(
    {
      ...indexed,
      createdAt: null,
      expiryDate: "18446744073709551615",
      wrappedOwner: { id: "wrapped-owner" },
    },
    true
  );
  assert.equal(details.createdAt, null);
  assert.equal(details.expiryDate, null);
  assert.equal(details.owner, "wrapped-owner");
  assert.equal(details.registrant, "registrant");
});

test("registration transaction remains available without a valid expiry", () => {
  for (const expiryDate of [
    undefined,
    null,
    "bad",
    "0",
    Infinity,
    "18446744073709551615",
  ]) {
    assert.deepEqual(
      registrationDetails({
        blockNumber: 9438317,
        transactionID: "tx",
        expiryDate,
      }),
      { blockNumber: 9438317, transactionID: "tx", expiryDate: null }
    );
  }
  assert.equal(registrationDetails(undefined), null);
  assert.equal(
    registrationDetails({
      blockNumber: 1,
      transactionID: "tx",
      expiryDate: "1700000000",
    })?.expiryDate,
    1700000000
  );
});
