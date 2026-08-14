import "server-only";

import {
  getPreorderStorageClient,
  preorderStorageBucket,
} from "@/lib/preorder-catalog-store";

type SalesNumberSequence =
  | "daily-orders"
  | "preorders";

const sequenceFolder = "sequences";
const sequenceFileDigits = 12;

function getSequencePath(
  sequence: SalesNumberSequence,
  number: number
) {
  return `${sequenceFolder}/${sequence}/${String(number).padStart(
    sequenceFileDigits,
    "0"
  )}.json`;
}

function parseSequenceNumber(fileName: string) {
  const match = fileName.match(/^(\d{12})\.json$/);

  return match ? Number(match[1]) : 0;
}

async function getLastReservedNumber(
  sequence: SalesNumberSequence
) {
  const supabase =
    await getPreorderStorageClient();
  const { data: files, error } =
    await supabase.storage
      .from(preorderStorageBucket)
      .list(`${sequenceFolder}/${sequence}`, {
        limit: 1,
        sortBy: {
          column: "name",
          order: "desc",
        },
      });

  if (error) {
    throw new Error(
      "Não foi possível consultar a numeração."
    );
  }

  return parseSequenceNumber(
    files?.[0]?.name ?? ""
  );
}

async function reserveNextNumber(
  sequence: SalesNumberSequence
) {
  let candidate =
    (await getLastReservedNumber(sequence)) + 1;

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const supabase =
      await getPreorderStorageClient();
    const body = new Blob(
      [
        JSON.stringify({
          number: candidate,
          reservedAt: new Date().toISOString(),
        }),
      ],
      { type: "application/json" }
    );
    const { error } = await supabase.storage
      .from(preorderStorageBucket)
      .upload(
        getSequencePath(sequence, candidate),
        body,
        {
          contentType: "application/json",
          cacheControl: "0",
          upsert: false,
        }
      );

    if (!error) {
      return candidate;
    }

    const lastReserved =
      await getLastReservedNumber(sequence);

    if (lastReserved < candidate) {
      throw new Error(
        "Não foi possível reservar a numeração."
      );
    }

    candidate = lastReserved + 1;
  }

  throw new Error(
    "Não foi possível reservar a numeração após várias tentativas."
  );
}

export function reserveNextDailyOrderNumber() {
  return reserveNextNumber("daily-orders");
}

export async function reserveNextPreorderNumber() {
  const number = await reserveNextNumber(
    "preorders"
  );

  return `ENC-${String(number).padStart(3, "0")}`;
}
