import * as url from "url";
import { MongoClient, Collection } from "mongodb";

const collectionName = "tenhocphan";

class Database {
    public collection: Collection;

    public async createConnection(mongoUri: string): Promise<void> {
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

                this.collection = client.db(dbName).collection(collectionName);

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

    public findAll(): Promise<{ [subjectId: string]: string }> {
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

export default new Database();
