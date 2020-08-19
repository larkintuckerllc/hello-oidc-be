const cors = require('cors');
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
app.use(cors())

app.get('/login-screen', (req, res) => {
  const { nonce, state } = req.query;
  if (state === undefined || nonce === undefined) {
    res.status(400).send('missing state and nonce URL parameters');
    return;
  }
  const loginUri = auth.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    nonce,
    scope: 'https://www.googleapis.com/auth/userinfo.email',
    state,
  });
  res.redirect(loginUri);
});

app.get('/get-tokens', async (req, res) => {
  const { code } = req.query;
  if (code === undefined) {
    res.status(400).send('missing code URL parameters');
    return;
  }
  try {
    const { tokens: { id_token, refresh_token } } = await auth.getToken(code);
    res.send({
      id_token,
      refresh_token,
    });
  } catch (err) {
    res.status(401).send('unauthorized');
  }
});

app.get('/', (req, res) => {
  res.send({ hello: 'world!'});
});

app.listen(process.env.PORT, () => {
  console.log(`Example app listening at http://localhost:${process.env.PORT}`);
});
