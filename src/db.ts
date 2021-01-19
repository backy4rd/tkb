import { MongoClient, Collection } from "mongodb";

const collectionName = "tenhocphan";

class Database {
    public collection: Collection;

    public async createConnection(mongoUri: string): Promise<void> {
        const url = mongoUri.slice(0, mongoUri.lastIndexOf("/"));
        const dbName = mongoUri.slice(mongoUri.lastIndexOf("/") + 1, mongoUri.indexOf("?"));

        const client = new MongoClient(url, {
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
}

export default new Database();
