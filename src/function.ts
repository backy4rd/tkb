import * as _ from 'lodash';
import * as request from 'request-promise';

const groupsPattern = /(?<=class="((main_3)|(level_1_\d))"( style.+)?>).+?(?=<\/td>)/g;
const PhpSessIdPattern = /(?<=PHPSESSID=).+?(?=;)/;

const loginUrl = 'https://qldt.ctu.edu.vn/htql/sinhvien/dang_nhap.php';
const getGroupsUrl =
  'https://qldt.ctu.edu.vn/htql/dkmh/student/index.php?action=dmuc_mhoc_hky';
const grantAccessUrl =
  'https://qldt.ctu.edu.vn/htql/dkmh/student/dang_nhap.php';

export async function login(
  studentId: string,
  password: string,
): Promise<string> {
  const response = await request.post(loginUrl, {
    form: {
      txtDinhDanh: studentId,
      txtMatKhau: password,
    },
    resolveWithFullResponse: true,
  });

  if (/logout.php/.test(response.body)) {
    throw new Error('login fail');
  }

  const [PHPSESSID] = response.headers['set-cookie']
    .join(', ')
    .match(PhpSessIdPattern);

  // grant access to dkmh
  await request.post(grantAccessUrl, {
    headers: {
      Cookie: `PHPSESSID=${PHPSESSID}`,
    },
    form: {
      txtDinhDanh: studentId,
      txtMatKhau: 'p',
    },
  });

  return PHPSESSID;
}

export async function getGroups(
  semester: number,
  year: number,
  subjectId: string,
  sessionId: string,
) {
  const data = await request.post(getGroupsUrl, {
    headers: {
      cookie: `PHPSESSID=${sessionId}`,
    },
    form: {
      cmbHocKy: semester,
      cmbNamHoc: year,
      txtMaMH: subjectId,
    },
  });

  // Remove annoying character
  const html = data.replace(/&nbsp;/g, '');
  const flatData = html.match(groupsPattern);

  if (flatData === null) {
    throw new Error('invalid session id');
  }

  // Remove header row
  flatData.splice(0, 10);

  const groups = [];

  while (flatData.length) {
    const row = flatData.splice(0, 10);

    // Handle group don't have schedule
    if (row[4].includes('*')) {
      // Give element back to floatData because of taking 10 element
      if (row.length !== 7) {
        flatData.unshift(...row.splice(6, 10));
      }

      // Full fill unexist schedule with zero
      row.splice(2, 0, ...[0, 0, 0, 0]);
    }

    const group = {
      kihieu: row[1],
      thu: +row[2],
      tiet: new Array(+row[4]).fill(0).map((t, i) => +row[3] + i),
      phong: row[5],
      siso: +row[6],
      conlai: +row[7],
      // tuanhoc: row[8].match(/\d/g).map(Number),
      lopHP: row[9],
    };

    groups.push(group);
  }

  if (groups.length === 0) {
    throw new Error(
      `invalid subjectId or subject isn't opened in this semester`,
    );
  }

  return _.chain(groups)
    .groupBy((group) => group.kihieu)
    .map((value, key) => {
      return {
        kihieu: key,
        siso: value[0].siso,
        conlai: value[0].conlai,
        // tuanhoc: value[0].tuanhoc,
        lopHP: value[0].lopHP,
        buoihoc: value
          .map((l) => ({
            phong: l.phong,
            tiet: l.tiet,
            thu: l.thu,
          }))
          // Filter group don't have schedule
          .filter((l) => l.thu !== 0),
      };
    })
    .value();
}
