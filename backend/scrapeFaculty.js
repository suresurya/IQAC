import axios from "axios";
import * as cheerio from "cheerio";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";

dotenv.config();

const PEOPLE_URL = "https://vignan.ac.in/newvignan/people.php";
const DETAILS_URL = "https://vignan.ac.in/newvignan/getfaculty.php";
const DB_NAME = "iqac_monitoring_system";
const COLLECTION_NAME = "faculty";

function buildMongoUri() {
  const rawUri = process.env.MONGO_URI;
  if (!rawUri) {
    throw new Error("Missing MONGO_URI in environment.");
  }

  if (rawUri.includes("<db_password>")) {
    const dbPassword = process.env.DB_PASSWORD;
    if (!dbPassword) {
      throw new Error("MONGO_URI contains <db_password> but DB_PASSWORD is missing.");
    }
    return rawUri.replace("<db_password>", encodeURIComponent(dbPassword));
  }

  return rawUri;
}

function cleanText(value) {
  return (value || "")
    .replace(/<br\s*\/?>/gi, ", ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeName(name) {
  return cleanText(name).toLowerCase();
}

function toAbsoluteUrl(pathOrUrl) {
  if (!pathOrUrl) return "";
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return new URL(pathOrUrl.replace(/^\.\.\//, ""), "https://vignan.ac.in/").toString();
}

function parseFacultyCards(html) {
  const $ = cheerio.load(html);
  const cards = [];

  $(".faculty-card").each((_, el) => {
    const card = $(el);
    const id = cleanText(card.find("button.view-profile-btn").attr("id"));
    const name = cleanText(card.find(".aboutus-div-56").text());
    const branchText = cleanText(card.find(".faculty-branch").text());
    const interestText = cleanText(card.find(".faculty-interest").text());
    const image = toAbsoluteUrl(card.find("img.faculty-img").attr("src"));

    if (!id || !name) {
      return;
    }

    cards.push({
      empCode: id,
      name,
      branchText,
      cardResearchAreas: interestText,
      image,
      cardSource: PEOPLE_URL
    });
  });

  return cards;
}

function parseBranch(branchText) {
  const match = branchText.match(/^(.*?)\s*\((.*?)\)\s*$/);
  if (!match) {
    return {
      designation: branchText || "Not Available",
      department: "Not Available"
    };
  }

  return {
    designation: cleanText(match[1]) || "Not Available",
    department: cleanText(match[2]) || "Not Available"
  };
}

async function fetchFacultyDetails(empCode) {
  try {
    const response = await axios.post(
      DETAILS_URL,
      new URLSearchParams({ id: empCode }).toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        timeout: 20000
      }
    );

    const payload = typeof response.data === "string" ? JSON.parse(response.data) : response.data;
    return payload;
  } catch (error) {
    return {
      empcode: empCode,
      detailsError: error.message
    };
  }
}

function toArrayText(list, field) {
  if (!Array.isArray(list)) return [];
  return list
    .map((item) => cleanText(item?.[field]))
    .filter(Boolean);
}

async function mapWithConcurrency(items, mapper, concurrency = 12) {
  const results = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const chunk = items.slice(i, i + concurrency);
    const chunkResults = await Promise.all(chunk.map((item) => mapper(item)));
    results.push(...chunkResults);
  }
  return results;
}

async function run() {
  const mongoUri = buildMongoUri();

  const listingResponse = await axios.get(PEOPLE_URL, { timeout: 30000 });
  const cards = parseFacultyCards(listingResponse.data);

  if (!cards.length) {
    throw new Error("No faculty cards found from people.php.");
  }

  const details = await mapWithConcurrency(cards, (card) => fetchFacultyDetails(card.empCode), 15);
  const detailByEmpCode = new Map(details.map((item) => [String(item.empcode || ""), item]));

  const combined = cards.map((card) => {
    const detail = detailByEmpCode.get(String(card.empCode)) || {};
    const branch = parseBranch(card.branchText);

    const detailName = cleanText(detail.name);
    const designation = cleanText(detail.desig) || branch.designation;
    const department = cleanText(detail.branch) || branch.department;

    const interests = toArrayText(detail.interests, "interest");
    const research = toArrayText(detail.research, "research");
    const teaching = toArrayText(detail.teachingengmnts, "teachingengmnts");

    const researchAreas = [...new Set([...interests, ...research, ...teaching])];

    return {
      name: detailName || card.name,
      designation: designation || "Not Available",
      department: department || "Not Available",
      researchAreas: researchAreas.length ? researchAreas : (card.cardResearchAreas ? [card.cardResearchAreas] : []),
      profileLink: `${DETAILS_URL}?id=${encodeURIComponent(card.empCode)}`,
      imageUrl: card.image,
      email: cleanText(detail.email) || "Not Available",
      contact: cleanText(detail.contact) || "Not Available",
      empCode: String(card.empCode),
      source: PEOPLE_URL,
      scrapedAt: new Date()
    };
  });

  const uniqueInRun = new Map();
  for (const doc of combined) {
    const key = normalizeName(doc.name);
    if (!key) continue;
    if (!uniqueInRun.has(key)) {
      uniqueInRun.set(key, doc);
    }
  }
  const dedupedRunDocs = [...uniqueInRun.values()];

  const client = new MongoClient(mongoUri);
  await client.connect();

  try {
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);

    await collection.createIndex({ name: 1 }, { unique: true });

    const existing = await collection
      .find({ name: { $in: dedupedRunDocs.map((d) => d.name) } }, { projection: { name: 1 } })
      .toArray();

    const existingSet = new Set(existing.map((e) => normalizeName(e.name)));
    const newDocs = dedupedRunDocs.filter((doc) => !existingSet.has(normalizeName(doc.name)));

    if (!newDocs.length) {
      console.log("Inserted 0 faculty documents (all already exist by name).");
      return;
    }

    const insertResult = await collection.insertMany(newDocs, { ordered: false });
    console.log(`Inserted ${insertResult.insertedCount} faculty documents into ${DB_NAME}.${COLLECTION_NAME}.`);
  } finally {
    await client.close();
  }
}

run().catch((error) => {
  console.error("Scrape failed:", error.message);
  process.exitCode = 1;
});
