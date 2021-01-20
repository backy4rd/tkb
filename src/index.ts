import * as path from "path";
import * as express from "express";
import * as rootCas from "ssl-root-cas";
import { Request, Response, NextFunction, Application } from "express";

import { getGroupsAndCache, getSubjectName, getAvalibleSchoolYear, login } from "./function";
import db from "./db";

rootCas.addFile(path.resolve(__dirname, "../cert/htql.pem"));
require("https").globalAgent.options.ca = rootCas;

const app: Application = express();

const mssv = process.env.MSSV;
const matkhau = process.env.MATKHAU;
const mongoUri = process.env.MONGODB_URI;
const allowOrigin = process.env.ALLOW_ORIGIN?.split(",");
const port = process.env.PORT || 8080;

if (!mongoUri || !mssv || !matkhau) {
    throw new Error("missing env variable");
}

let sessionId, year, semester;

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
        const namhoc = +req.query.namhoc;
        const mahp = req.params.subjectIds as string;
        const hocky = +req.query.hocky;

        if (!namhoc || !hocky) {
            throw new Error("invalid or missing query parameters");
        }

        const subjectIds = mahp
            .trim()
            .replace(/\s+/g, "")
            .split(",")
            .map((e) => e.toUpperCase());

        const responseData = {};

        await Promise.all(
            subjectIds.map((subjectId) =>
                getGroupsAndCache(hocky, namhoc, subjectId, sessionId).then((group) => {
                    responseData[subjectId] = group;
                })
            )
        );

        res.status(200).json({ data: responseData });

        // handle exception
    } catch (err) {
        if (err.message === "invalid session id") {
            console.log("retrive session id");
            sessionId = await login(mssv, matkhau);
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
        const mahp = req.params.subjectId as string;

        const storedSubjectName = await db.find(mahp);

        if (storedSubjectName !== null) {
            return res.status(200).json({ data: storedSubjectName });
        }

        const subjectName = await getSubjectName(semester, year, mahp, sessionId);

        if (subjectName === null) {
            return res.status(404).json({ error: "subject not found" });
        }

        await db.insert(mahp.toUpperCase(), subjectName);

        return res.status(200).json({ data: subjectName });

        // handle exception
    } catch (err) {
        if (err.message === "invalid session id") {
            console.log("retrive session id");
            sessionId = await login(mssv, matkhau);
            return _doGet(req, res);
        }

        res.status(400).json({
            error: { message: err.message },
        });
    }
});

async function init() {
    await db.createConnection(mongoUri);

    const PHPSESSID = await login(mssv, matkhau);
    sessionId = PHPSESSID;

    const schoolYear = await getAvalibleSchoolYear(sessionId);
    year = schoolYear.year;
    semester = schoolYear.semester;

    app.listen(port, () => {
        console.log("server listening on port " + port);
    });
}

init();
