import * as url from "url";
import { MongoClient, Collection } from "mongodb";

const collectionName = "tenhocphan";

class Database {
    public collection: Collection;

    public async createConnection(mongoUri: string): Promise<void> {
        const { protocol, auth, host, pathname } = url.parse(mongoUri);

        const uri = `${protocol}//${auth}@${host}`;
        const dbName = pathname.slice(1); // remove slash

        console.log(uri, dbName);

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

    public insert(mahp: string, tenhp: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.collection.insertOne({ mahp, tenhp }, (err) => {
                if (err) return reject(err);

                resolve();
            });
        });
    }

    public find(mahp: string): Promise<string> {
        return new Promise((resolve, reject) => {
            this.collection.find({ mahp }).toArray((err, result) => {
                if (err) return reject(err);

                if (result.length === 0) return resolve(null);

                resolve(result[0].tenhp);
            });
        });
    }

    public findAll(): Promise<{ [mahp: string]: string }> {
        return new Promise((resolve, reject) => {
            this.collection.find({}).toArray((err, result) => {
                if (err) return reject(err);

                const returnValue = result.reduce((acc, cur) => {
                    acc[cur.mahp] = cur.tenhp;
                    return acc;
                }, {});

                resolve(returnValue);
            });
        });
    }
}

export default new Database();
