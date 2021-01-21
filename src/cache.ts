type Cache = {
    [semester: string]: {
        [year: string]: {
            [subjectId: string]: {
                expire: Date;
                value: any;
            };
        };
    };
};

type Key = {
    subjectId: string;
    year: number;
    semester: number;
};

const cache: Cache = {};

export function set(key: Key, value: any, expire: number): void {
    const { subjectId, year, semester } = key;

    if (!cache[semester]) cache[semester] = {};
    if (!cache[semester][year]) cache[semester][year] = {};

    cache[semester][year][subjectId] = {
        value: value,
        expire: new Date(Date.now() + expire * 1000),
    };
}

export function get({ subjectId, year, semester }: Key): any {
    const cached = cache?.[semester]?.[year]?.[subjectId];
    if (!cached) return undefined;

    if (cached.expire.getTime() < Date.now()) {
        delete cache[semester][year][subjectId];
        return undefined;
    }

    return cache[semester][year][subjectId].value;
}

// expired remover
setInterval(() => {
    for (const semester in cache) {
        for (const year in cache[semester]) {
            for (const subjectId in cache[semester][year]) {
                const cached = cache[semester][year][subjectId];

                if (cached.expire.getTime() < Date.now()) {
                    delete cache[semester][year][subjectId];
                }
            }
        }
    }

    console.log(cache); // for debug
}, 60 * 60 * 1000);
