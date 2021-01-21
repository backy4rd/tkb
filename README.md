# tkb api

This project provide an API that collect data from qldt.ctu.edu.vn.

## Getting started

Clone the repository:
```
git clone https://github.com/backy4rd/tkb
cd tkb
```
Create .env file or define these enviroment variables:
 - `PORT`: the port that application will run on (default: 8080).
 - `MONGODB_URI`: mongodb connection uri (It will use file instead if this variable isn't defined).
 - `STUDENT_ID`: student id that use for login at htql.ctu.edu.vn
 - `PASSWORD`: the password that use for login at htql.ctu.edu.vn
 - `ALLOW_ORIGIN`: list of allow origin separate with <,>.

Install dependencies:
```
npm install
```
Build and Run:
```
npm run build
npm start
```
## Response structure
Success:
```
{
	"data": any
}
```
Fail:
```
{
	"error": {
		"message": string
	}
}
```

## Endpoint 



### /groups/:subject_ids?year={year}&semester={semester}

Return the open groups in specific year and semester of subjects.

*Parameters:*

 - `subject_ids`: string (each subject separate by <,> *Ex: CT100,CT200*).
 - `year`: number (if school year is 2020-2021, this value will be 2021).
 - `semester`: number (1, 2 or 3).

*Response:*
```
{
	"data": {
		"[subject_id]": [
			{
				"kihieu": string,
				"siso": number,
				"conlai": number,
				"tuanhoc": string,
				"lopHP": string,
				"buoihoc": [
					{
						"phong": string,
						"tiet": [number, ...],
						"thu": number,
					},
					...
				]
			},
			...
		],
		...
	}
}
```

### /subjects/:subject_id

Return name of that subject.

*Parameters*:

- `subject_id`: string.

*Response:*
```
{
	"data": string
}
```

### /subjects
Return name of all stored subject.

*Response:*
```
{
	"data": {
		"[subject_id]": string,
		...
	}
}
```
