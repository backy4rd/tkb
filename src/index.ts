import * as path from "path";
import * as express from "express";
import * as dotenv from "dotenv";
import * as rootCas from "ssl-root-cas";
import { Request, Response, NextFunction, Application } from "express";

import { getGroupsAndCache, getSubjectName, getAvailableSchoolYear, login } from "./function";
import { IDatabase, mongoDB, fileDB } from "./db";

rootCas.addFile(path.resolve(__dirname, "../cert/htql.pem"));
require("https").globalAgent.options.ca = rootCas;

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const app: Application = express();

const studentId = process.env.STUDENT_ID;
const password = process.env.PASSWORD;
const mongoUri = process.env.MONGODB_URI;
const allowOrigin = process.env.ALLOW_ORIGIN?.split(",");
const port = process.env.PORT || 8080;

let sessionId: string;
let year: number;
let semester: number;
let db: IDatabase;

if (!studentId || !password) {
    throw new Error("missing env variable");
}

if (mongoUri) {
    db = mongoDB;
} else {
    db = fileDB;
}

app.disable("etag");

app.use((req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;

    if (allowOrigin === undefined) {
        res.setHeader("Access-Control-Allow-Origin", "*");
    } else if (allowOrigin.indexOf(origin) !== -1) {
        res.setHeader("Access-Control-Allow-Origin", origin);
    }

    next();
});

app.get("/groups/:subjectIds", async function _doGet(req: Request, res: Response) {
    try {
        const _year = +req.query.year;
        const _subjectIds = req.params.subjectIds;
        const _semester = +req.query.semester;

        if (!_year || !_semester) {
            throw new Error("invalid or missing query parameters");
        }

        const subjectIds = _subjectIds
            .trim()
            .replace(/\s+/g, "")
            .split(",")
            .map((e) => e.toUpperCase());

        const responseData = {};

        await Promise.all(
            subjectIds.map((subjectId) =>
                getGroupsAndCache(_semester, _year, subjectId, sessionId).then((group) => {
                    responseData[subjectId] = group;
                })
            )
        );

        res.status(200).json({ data: responseData });

        // handle exception
    } catch (err) {
        if (err.message === "invalid session id") {
            console.log("retrive session id");
            sessionId = await login(studentId, password);
            return _doGet(req, res);
        }

        res.status(400).json({
            error: { message: err.message },
        });
    }
});

app.get("/subjects", async function (req: Request, res: Response) {
    try {
        const subjects = await db.findAll();

        res.status(200).json({ data: subjects });

        // handle exception
    } catch (err) {
        res.status(400).json({
            error: { message: err.message },
        });
    }
});

app.get("/subjects/:subjectId", async function _doGet(req: Request, res: Response) {
    try {
        const _subjectId = req.params.subjectId.toUpperCase();

        const storedSubjectName = await db.find(_subjectId);
        if (storedSubjectName !== null) {
            return res.status(200).json({ data: storedSubjectName });
        }

        const subjectName = await getSubjectName(semester, year, _subjectId, sessionId);
        if (subjectName === null) {
            return res.status(404).json({ error: "subject not found" });
        }

        await db.insert(_subjectId, subjectName);
        return res.status(200).json({ data: subjectName });

        // handle exception
    } catch (err) {
        if (err.message === "invalid session id") {
            console.log("retrive session id");
            sessionId = await login(studentId, password);
            return _doGet(req, res);
        }

        res.status(400).json({
            error: { message: err.message },
        });
    }
});

async function init() {
    if (mongoUri) {
        await db.init(mongoUri);
    } else {
        await db.init(path.resolve(__dirname, "../db.json"));
    }

    const PHPSESSID = await login(studentId, password);
    sessionId = PHPSESSID;

    const schoolYear = await getAvailableSchoolYear(sessionId);
    year = schoolYear.year;
    semester = schoolYear.semester;

    app.listen(port, () => {
        console.log("server listening on port " + port);
    });
}

init();
