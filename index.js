const cors = require('cors');
const dotenv = require('dotenv');
const express = require('express');
const fetch = require('node-fetch');
const jwksRSA = require('jwks-rsa');
const jwt = require('jsonwebtoken');
const googleapis = require('googleapis');

const { google } = googleapis;
const AUTHORIZATION_RE = /^Bearer (?<token>.+)/;
const GOOGLE_OPENID_CONFIG = 'https://accounts.google.com/.well-known/openid-configuration';

if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

const auth = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
);

const execute = async () => {
  try {
    // GOOGLE PUBLIC KEY
    const responseConfig = await fetch(GOOGLE_OPENID_CONFIG);
    if (!responseConfig.ok) {
      throw new Error();
    }
    const { jwks_uri } = await responseConfig.json();
    const responseJWKS = await fetch(jwks_uri);
    if (!responseConfig.ok) {
      throw new Error();
    }
    const { keys } = await responseJWKS.json();
    const jwksClient = jwksRSA({
      jwksUri: jwks_uri,
    });
    const key = await jwksClient.getSigningKeyAsync(keys[1].kid);
    const publicKey = key.getPublicKey();

    // EXPRESS
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
      const authorization = req.header('Authorization');
      if (authorization === undefined) {
        res.status(401).send('unauthorized');
        return;
      }
      const found = authorization.match(AUTHORIZATION_RE);
      if (found === null) {
        res.status(401).send('unauthorized');
        return;
      }
      const { groups: { token } } = found;
      const { email } = jwt.verify(token, publicKey);
      res.send({ hello: email });
    });
    app.listen(process.env.PORT, () => {
      console.log(`Example app listening at http://localhost:${process.env.PORT}`);
    });
  } catch (err) {
    console.log(err);
    process.exit(1);
  }
};

execute();
