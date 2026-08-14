import type { Express, NextFunction, Request, Response } from "express";
import multer from "multer";
import {
  createConnection,
  createFact,
  createGift,
  createImportantDate,
  createInteraction,
  createNews,
  createPerson,
  createReminder,
  deleteConnection,
  deleteFact,
  deleteGift,
  deleteImportantDate,
  deleteInteraction,
  deleteNews,
  deletePerson,
  deleteReminder,
  getPersonDetail,
  getPhoto,
  getToday,
  listImportantDates,
  listPeople,
  listTags,
  listTimeline,
  setPhoto,
  updateFact,
  updateGift,
  updateImportantDate,
  updateInteraction,
  updateNews,
  updatePerson,
  updateReminder,
} from "./repo.ts";
import type { Circle, TimelineKind } from "../shared/types.ts";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

function pid(req: Request): string {
  const value = req.params.id;
  return Array.isArray(value) ? value[0]! : value!;
}

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

export function registerRoutes(app: Express): void {
  app.get("/api/people", (req, res) => {
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const circle = typeof req.query.circle === "string" ? (req.query.circle as Circle) : undefined;
    const tag = typeof req.query.tag === "string" ? req.query.tag : undefined;
    res.json(listPeople({ search, circle, tag }));
  });

  app.post(
    "/api/people",
    asyncHandler(async (req, res) => {
      res.status(201).json(createPerson(req.body));
    }),
  );

  app.get("/api/people/:id", (req, res) => {
    const detail = getPersonDetail(pid(req));
    if (!detail) {
      res.status(404).json({ error: "Person not found" });
      return;
    }
    res.json(detail);
  });

  app.put("/api/people/:id", (req, res) => {
    res.json(updatePerson(pid(req), req.body));
  });

  app.delete("/api/people/:id", (req, res) => {
    deletePerson(pid(req));
    res.status(204).end();
  });

  app.get("/api/people/:id/photo", (req, res) => {
    const photo = getPhoto(pid(req));
    if (!photo) {
      res.status(404).end();
      return;
    }
    res.setHeader("Content-Type", photo.mime);
    res.setHeader("Cache-Control", "private, max-age=60");
    res.send(Buffer.from(photo.data));
  });

  app.post("/api/people/:id/photo", upload.single("photo"), (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: "No photo uploaded" });
      return;
    }
    setPhoto(pid(req), req.file.buffer, req.file.mimetype || "image/jpeg");
    res.json({ ok: true });
  });

  app.get("/api/tags", (_req, res) => {
    res.json(listTags());
  });

  app.post("/api/interactions", (req, res) => {
    res.status(201).json(createInteraction(req.body));
  });
  app.put("/api/interactions/:id", (req, res) => {
    res.json(updateInteraction(req.params.id, req.body));
  });
  app.delete("/api/interactions/:id", (req, res) => {
    deleteInteraction(req.params.id);
    res.status(204).end();
  });

  app.post("/api/facts", (req, res) => {
    res.status(201).json(createFact(req.body));
  });
  app.put("/api/facts/:id", (req, res) => {
    res.json(updateFact(req.params.id, req.body));
  });
  app.delete("/api/facts/:id", (req, res) => {
    deleteFact(req.params.id);
    res.status(204).end();
  });

  app.post("/api/news", (req, res) => {
    res.status(201).json(createNews(req.body));
  });
  app.put("/api/news/:id", (req, res) => {
    res.json(updateNews(req.params.id, req.body));
  });
  app.delete("/api/news/:id", (req, res) => {
    deleteNews(req.params.id);
    res.status(204).end();
  });

  app.post("/api/dates", (req, res) => {
    res.status(201).json(createImportantDate(req.body));
  });
  app.put("/api/dates/:id", (req, res) => {
    res.json(updateImportantDate(req.params.id, req.body));
  });
  app.delete("/api/dates/:id", (req, res) => {
    deleteImportantDate(req.params.id);
    res.status(204).end();
  });
  app.get("/api/dates", (_req, res) => {
    res.json(listImportantDates());
  });

  app.post("/api/reminders", (req, res) => {
    res.status(201).json(createReminder(req.body));
  });
  app.put("/api/reminders/:id", (req, res) => {
    res.json(updateReminder(req.params.id, req.body));
  });
  app.delete("/api/reminders/:id", (req, res) => {
    deleteReminder(req.params.id);
    res.status(204).end();
  });

  app.post("/api/gifts", (req, res) => {
    res.status(201).json(createGift(req.body));
  });
  app.put("/api/gifts/:id", (req, res) => {
    res.json(updateGift(req.params.id, req.body));
  });
  app.delete("/api/gifts/:id", (req, res) => {
    deleteGift(req.params.id);
    res.status(204).end();
  });

  app.post("/api/connections", (req, res) => {
    res.status(201).json(createConnection(req.body));
  });
  app.delete("/api/connections/:id", (req, res) => {
    deleteConnection(req.params.id);
    res.status(204).end();
  });

  app.get("/api/timeline", (req, res) => {
    const personId = typeof req.query.personId === "string" ? req.query.personId : undefined;
    const type = typeof req.query.type === "string" ? (req.query.type as TimelineKind) : undefined;
    res.json(listTimeline({ personId, type }));
  });

  app.get("/api/today", (_req, res) => {
    res.json(getToday());
  });

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const status = typeof err === "object" && err && "status" in err ? Number(err.status) : 500;
    const message = err instanceof Error ? err.message : "Server error";
    res.status(status || 500).json({ error: message });
  });
}
