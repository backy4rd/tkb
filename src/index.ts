import * as path from 'path';
import * as express from 'express';
import * as rootCas from 'ssl-root-cas';
import { Request, Response, NextFunction, Application } from 'express';

import { getGroups, login } from './function';

rootCas.addFile(path.resolve(__dirname, '../cert/htql.pem'));
require('https').globalAgent.options.ca = rootCas;

const app: Application = express();

const mssv = process.env.MSSV;
const matkhau = process.env.MATKHAU;
const allowOrigin = process.env.ALLOW_ORIGIN || '*';
const port = process.env.PORT || 8080;

let sessionId;

app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Access-Control-Allow-Origin', allowOrigin);
  next();
});

app.get('/groups', async function _doGet(req: Request, res: Response) {
  try {
    const namhoc = +req.query.namhoc;
    const mahp = req.query.mahp as string;
    const hocky = +req.query.hocky;

    if (!mahp || !namhoc || !hocky) {
      throw new Error('invalid or missing query parameters');
    }

    const subjectIds = mahp.trim().replace(/\s+/g, '').split(',');
    const responseData = {};

    await Promise.all(
      subjectIds.map((subjectId) =>
        getGroups(hocky, namhoc, subjectId, sessionId).then((group) => {
          responseData[subjectId.toUpperCase()] = group;
        }),
      ),
    );

    res.status(200).json({ data: responseData });

    // handle exception
  } catch (err) {
    if (err.message === 'invalid session id') {
      console.log('retrive session id');
      sessionId = await login(mssv, matkhau);
      return _doGet(req, res);
    }

    res.status(400).json({
      error: { message: err.message },
    });
  }
});

login(mssv, matkhau)
  .then((PHPSESSID) => {
    sessionId = PHPSESSID;
  })
  .then(() => {
    app.listen(port, () => {
      console.log('server listening on port ' + port);
    });
  });
