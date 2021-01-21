import * as url from "url";
import * as fs from "fs";
import { MongoClient, Collection } from "mongodb";

type SubjectNames = {
    [subjectId: string]: string;
};

export interface IDatabase {
    init(uri: string): Promise<void>;
    insert(subjectId: string, subjectName: string): Promise<void>;
    find(subjectId: string): Promise<string>;
    findAll(): Promise<SubjectNames>;
}

class MongoDB implements IDatabase {
    private readonly collectionName = "subjects";
    private collection: Collection;

    public init(mongoUri: string): Promise<void> {
        const { protocol, auth, host, pathname } = url.parse(mongoUri);

        const uri = `${protocol}//${auth}@${host}`;
        const dbName = pathname.slice(1); // remove slash

        const client = new MongoClient(uri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        return new Promise((resolve, reject) => {
            client.connect((err) => {
                if (err) return reject(err);

                this.collection = client.db(dbName).collection(this.collectionName);

                resolve();
            });
        });
    }

    public insert(subjectId: string, subjectName: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.collection.insertOne({ subjectId, subjectName }, (err) => {
                if (err) return reject(err);

                resolve();
            });
        });
    }

    public find(subjectId: string): Promise<string> {
        return new Promise((resolve, reject) => {
            this.collection.find({ subjectId }).toArray((err, result) => {
                if (err) return reject(err);

                if (result.length === 0) return resolve(null);

                resolve(result[0].subjectName);
            });
        });
    }

    public findAll(): Promise<SubjectNames> {
        return new Promise((resolve, reject) => {
            this.collection.find({}).toArray((err, result) => {
                if (err) return reject(err);

                const returnValue = result.reduce((acc, cur) => {
                    acc[cur.subjectId] = cur.subjectName;
                    return acc;
                }, {});

                resolve(returnValue);
            });
        });
    }
}

class FileDB implements IDatabase {
    private filepath: string;

    public init(filepath: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.filepath = filepath;

            fs.exists(filepath, (exists) => {
                if (exists) return resolve();

                fs.writeFile(filepath, "{}", (err) => {
                    if (err) return reject(err);

                    resolve();
                });
            });
        });
    }

    public async insert(subjectId: string, subjectName: string): Promise<void> {
        const json = await this.read();

        json[subjectId] = subjectName;
        await this.write(json);
    }

    public async find(subjectId: string): Promise<string> {
        const json = await this.read();

        if (!json[subjectId]) {
            return null;
        }

        return json[subjectId];
    }

    public findAll(): Promise<SubjectNames> {
        return this.read();
    }

    private read(): Promise<SubjectNames> {
        return new Promise((resolve, reject) => {
            fs.readFile(this.filepath, "utf8", (err, data) => {
                if (err) return reject(err);

                resolve(JSON.parse(data));
            });
        });
    }

    private write(data: SubjectNames): Promise<void> {
        return new Promise((resolve, reject) => {
            fs.writeFile(this.filepath, JSON.stringify(data), (err) => {
                if (err) return reject(err);

                resolve();
            });
        });
    }
}

export const mongoDB = new MongoDB();
export const fileDB = new FileDB();
