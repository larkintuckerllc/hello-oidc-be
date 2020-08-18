const dotenv = require('dotenv');
const express = require('express');
const googleapis = require('googleapis');

const { google } = googleapis;

if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

const auth = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
);

const app = express();

app.get('/login', (req, res) => {
  const { state } = req.query;
  if (state === undefined) {
    res.status(400).send('missing state URL parameter');
    return;
  }
  const loginUri = auth.generateAuthUrl({
    access_type: 'offline',
    scope: 'https://www.googleapis.com/auth/userinfo.email',
    state,
  });
  res.redirect(loginUri);
});

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(process.env.PORT, () => {
  console.log(`Example app listening at http://localhost:${process.env.PORT}`);
});
